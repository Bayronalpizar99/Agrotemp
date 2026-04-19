import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { GeminiEndpointType } from './gemini-endpoint.decorator';

class GeminiLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

interface QuotaWindow {
  name: 'minute' | 'hour' | 'day';
  limit: number;
  ttlMs: number;
}

interface GeminiRequestContext {
  actor: string;
  endpoint: GeminiEndpointType;
}

@Injectable()
export class GeminiUsageService {
  private readonly logger = new Logger(GeminiUsageService.name);

  constructor(
    @Inject('FIRESTORE') private readonly firestore: Firestore,
    private readonly configService: ConfigService,
  ) {}

  async enforceRequestLimits(ctx: GeminiRequestContext): Promise<void> {
    await this.ensureNotBlocked(ctx.actor);
    await this.consumeQuota(ctx);
  }

  async registerLimitHit(ctx: GeminiRequestContext, reason: string): Promise<void> {
    const now = Date.now();
    const dayBucket = this.getBucket(now, 'day');
    const ref = this.firestore.collection('gemini_abuse_events').doc(`${ctx.actor}:${dayBucket}`);

    const blockAfterHits = this.getNumberEnv('GEMINI_BLOCK_AFTER_HITS', 25);
    const blockMinutes = this.getNumberEnv('GEMINI_BLOCK_MINUTES', 20);
    const blockedUntilMs = now + blockMinutes * 60_000;

    let hitCount = 0;

    await this.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const currentHits = Number(snap.get('hits') ?? 0);
      hitCount = currentHits + 1;

      tx.set(
        ref,
        {
          actor: ctx.actor,
          endpoint: ctx.endpoint,
          hits: hitCount,
          lastReason: reason,
          updatedAt: FieldValue.serverTimestamp(),
          expiresAtMs: this.getWindowEnd(now, 'day').getTime() + 24 * 60 * 60 * 1000,
          expiresAt: new Date(this.getWindowEnd(now, 'day').getTime() + 24 * 60 * 60 * 1000),
        },
        { merge: true },
      );

      if (hitCount >= blockAfterHits) {
        const blockRef = this.firestore.collection('gemini_abuse_blocks').doc(ctx.actor);
        tx.set(
          blockRef,
          {
            actor: ctx.actor,
            blockedUntilMs,
            blockedUntilAt: new Date(blockedUntilMs),
            reason: `Demasiados eventos de rate-limit (${hitCount})`,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    });

    if (hitCount >= blockAfterHits) {
      this.logger.error(
        `[ALERTA ABUSO] Actor ${ctx.actor} bloqueado temporalmente por exceso de tráfico en ${ctx.endpoint}.`,
      );
      return;
    }

    this.logger.warn(
      `[RateLimit] Actor ${ctx.actor} excedió límite en ${ctx.endpoint}. Evento ${hitCount}/${blockAfterHits}.`,
    );
  }

  async acquireConcurrencySlot(ctx: GeminiRequestContext): Promise<void> {
    const maxConcurrent = this.getNumberEnv('GEMINI_MAX_CONCURRENT_REQUESTS', 2);
    const staleMs = this.getNumberEnv('GEMINI_CONCURRENCY_STALE_MS', 120_000);
    const now = Date.now();
    const ref = this.firestore.collection('gemini_concurrency').doc(ctx.actor);

    await this.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const updatedAtMs = Number(snap.get('updatedAtMs') ?? 0);
      let active = Number(snap.get('active') ?? 0);

      if (updatedAtMs > 0 && now - updatedAtMs > staleMs) {
        active = 0;
      }

      if (active >= maxConcurrent) {
        throw new GeminiLimitError(
          'Demasiadas solicitudes concurrentes. Intenta de nuevo en unos segundos.',
          5,
        );
      }

      tx.set(
        ref,
        {
          actor: ctx.actor,
          endpoint: ctx.endpoint,
          active: active + 1,
          updatedAtMs: now,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  }

  async releaseConcurrencySlot(actor: string): Promise<void> {
    const now = Date.now();
    const ref = this.firestore.collection('gemini_concurrency').doc(actor);

    await this.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const active = Number(snap.get('active') ?? 0);
      tx.set(
        ref,
        {
          active: Math.max(0, active - 1),
          updatedAtMs: now,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  }

  async recordUsage(
    ctx: GeminiRequestContext,
    payload: { statusCode: number; durationMs: number; estimatedCostUnits?: number },
  ): Promise<void> {
    const ref = this.firestore.collection('gemini_usage_logs').doc();
    await ref.set({
      actor: ctx.actor,
      endpoint: ctx.endpoint,
      statusCode: payload.statusCode,
      durationMs: payload.durationMs,
      estimatedCostUnits: payload.estimatedCostUnits ?? 0,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  asLimitError(error: unknown): GeminiLimitError | null {
    return error instanceof GeminiLimitError ? error : null;
  }

  private async ensureNotBlocked(actor: string): Promise<void> {
    const now = Date.now();
    const snap = await this.firestore.collection('gemini_abuse_blocks').doc(actor).get();
    if (!snap.exists) return;

    const blockedUntilMs = Number(snap.get('blockedUntilMs') ?? 0);
    if (blockedUntilMs <= now) return;

    const retryAfter = Math.max(1, Math.ceil((blockedUntilMs - now) / 1000));
    throw new GeminiLimitError(
      'Actor temporalmente bloqueado por patrón de abuso.',
      retryAfter,
    );
  }

  private async consumeQuota(ctx: GeminiRequestContext): Promise<void> {
    const now = Date.now();
    const windows = this.getWindowsForEndpoint(ctx.endpoint);

    const refs = windows.map((window) =>
      this.firestore
        .collection('gemini_rate_limits')
        .doc(`${ctx.actor}:${ctx.endpoint}:${window.name}:${this.getBucket(now, window.name)}`),
    );

    await this.firestore.runTransaction(async (tx) => {
      const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));

      for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        const snap = snapshots[i];
        const hits = Number(snap.get('hits') ?? 0);

        if (hits >= window.limit) {
          const retryAfter = Math.max(
            1,
            Math.ceil((this.getWindowEnd(now, window.name).getTime() - now) / 1000),
          );
          throw new GeminiLimitError(
            `Límite de ${window.name} excedido para ${ctx.endpoint}.`,
            retryAfter,
          );
        }
      }

      for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        const ref = refs[i];
        const snap = snapshots[i];
        const hits = Number(snap.get('hits') ?? 0);
        const bucket = this.getBucket(now, window.name);
        const expiresAtMs = this.getWindowEnd(now, window.name).getTime() + window.ttlMs;

        tx.set(
          ref,
          {
            actor: ctx.actor,
            endpoint: ctx.endpoint,
            window: window.name,
            bucket,
            hits: hits + 1,
            limit: window.limit,
            updatedAt: FieldValue.serverTimestamp(),
            expiresAtMs,
            expiresAt: new Date(expiresAtMs),
          },
          { merge: true },
        );
      }
    });
  }

  private getWindowsForEndpoint(endpoint: GeminiEndpointType): QuotaWindow[] {
    if (endpoint === 'chat') {
      return [
        {
          name: 'minute',
          limit: this.getNumberEnv('GEMINI_CHAT_LIMIT_MINUTE', 5),
          ttlMs: 60_000,
        },
        {
          name: 'hour',
          limit: this.getNumberEnv('GEMINI_CHAT_LIMIT_HOUR', 60),
          ttlMs: 60 * 60_000,
        },
        {
          name: 'day',
          limit: this.getNumberEnv('GEMINI_CHAT_LIMIT_DAY', 300),
          ttlMs: 24 * 60 * 60_000,
        },
      ];
    }

    return [
      {
        name: 'minute',
        limit: this.getNumberEnv('GEMINI_REPORT_LIMIT_MINUTE', 2),
        ttlMs: 60_000,
      },
      {
        name: 'hour',
        limit: this.getNumberEnv('GEMINI_REPORT_LIMIT_HOUR', 20),
        ttlMs: 60 * 60_000,
      },
      {
        name: 'day',
        limit: this.getNumberEnv('GEMINI_REPORT_LIMIT_DAY', 60),
        ttlMs: 24 * 60 * 60_000,
      },
    ];
  }

  private getBucket(nowMs: number, window: QuotaWindow['name']): string {
    const iso = new Date(nowMs).toISOString();
    if (window === 'minute') {
      return iso.slice(0, 16).replace(/[-:T]/g, '');
    }
    if (window === 'hour') {
      return iso.slice(0, 13).replace(/[-:T]/g, '');
    }
    return iso.slice(0, 10).replace(/-/g, '');
  }

  private getWindowEnd(nowMs: number, window: QuotaWindow['name']): Date {
    const date = new Date(nowMs);
    if (window === 'minute') {
      date.setUTCSeconds(0, 0);
      date.setUTCMinutes(date.getUTCMinutes() + 1);
      return date;
    }
    if (window === 'hour') {
      date.setUTCMinutes(0, 0, 0);
      date.setUTCHours(date.getUTCHours() + 1);
      return date;
    }
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 1);
    return date;
  }

  private getNumberEnv(name: string, fallback: number): number {
    const raw = this.configService.get<string>(name);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }
}
