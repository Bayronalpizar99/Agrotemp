import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

type RequestWithActor = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  geminiActor?: string;
};

@Injectable()
export class AgroApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AgroApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const configured = this.getConfiguredKeys();
    const allowInsecureDevMode = this.configService.get<string>('ALLOW_UNAUTHENTICATED_GEMINI') === 'true';

    if (configured.length === 0) {
      if (allowInsecureDevMode) {
        req.geminiActor = `ip:${req.ip ?? 'unknown'}`;
        this.logger.warn(
          'ALLOW_UNAUTHENTICATED_GEMINI=true: endpoints Gemini operan sin API key (solo para desarrollo).',
        );
        return true;
      }
      throw new ServiceUnavailableException(
        'Autenticación Gemini no configurada. Define AGRO_API_KEY o AGRO_API_KEYS.',
      );
    }

    const incomingKey = this.extractKey(req.headers);
    if (!incomingKey) {
      throw new UnauthorizedException('Falta credencial para endpoints Gemini.');
    }

    const isValid = configured.some((key) => this.safeCompare(key, incomingKey));
    if (!isValid) {
      throw new UnauthorizedException('Credencial inválida para endpoints Gemini.');
    }

    req.geminiActor = `key:${createHash('sha256').update(incomingKey).digest('hex').slice(0, 24)}`;
    return true;
  }

  private getConfiguredKeys(): string[] {
    const single = this.configService.get<string>('AGRO_API_KEY');
    const multiple = this.configService.get<string>('AGRO_API_KEYS');
    const joined = [single, multiple].filter(Boolean).join(',');
    return joined
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }

  private extractKey(headers: Record<string, string | string[] | undefined>): string | null {
    const headerKey = headers['x-agro-api-key'];
    const rawKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    if (rawKey?.trim()) return rawKey.trim();

    const authHeader = headers.authorization;
    const rawAuth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!rawAuth) return null;
    const match = rawAuth.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() ?? null;
  }

  private safeCompare(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return timingSafeEqual(aBuf, bBuf);
  }
}
