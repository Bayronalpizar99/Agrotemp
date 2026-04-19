import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, finalize } from 'rxjs';
import { GEMINI_ENDPOINT_KEY, GeminiEndpointType } from './gemini-endpoint.decorator';
import { GeminiUsageService } from './gemini-usage.service';

type RequestWithActor = {
  geminiActor?: string;
};

@Injectable()
export class GeminiConcurrencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: GeminiUsageService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const endpoint = this.reflector.get<GeminiEndpointType>(
      GEMINI_ENDPOINT_KEY,
      context.getHandler(),
    );
    if (!endpoint) return next.handle();

    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const res = context.switchToHttp().getResponse();
    const actor = req.geminiActor;
    if (!actor) {
      throw new UnauthorizedException('No se pudo identificar al actor para concurrencia.');
    }

    const startedAt = Date.now();
    try {
      await this.usageService.acquireConcurrencySlot({ actor, endpoint });
    } catch (error) {
      const limitError = this.usageService.asLimitError(error);
      if (!limitError) throw error;
      res.setHeader('Retry-After', String(limitError.retryAfterSeconds));
      throw new HttpException(
        {
          message: limitError.message,
          retryAfter: limitError.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = Number(res?.statusCode ?? 0);
        void this.usageService
          .recordUsage({ actor, endpoint }, { statusCode, durationMs })
          .catch(() => undefined);
        void this.usageService.releaseConcurrencySlot(actor).catch(() => undefined);
      }),
    );
  }
}
