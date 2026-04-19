import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GEMINI_ENDPOINT_KEY, GeminiEndpointType } from './gemini-endpoint.decorator';
import { GeminiUsageService } from './gemini-usage.service';

type RequestWithActor = {
  geminiActor?: string;
};

@Injectable()
export class GeminiUsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: GeminiUsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const endpoint = this.reflector.get<GeminiEndpointType>(
      GEMINI_ENDPOINT_KEY,
      context.getHandler(),
    );
    if (!endpoint) return true;

    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const res = context.switchToHttp().getResponse();
    const actor = req.geminiActor;
    if (!actor) {
      throw new UnauthorizedException('No se pudo identificar al actor para control de uso.');
    }

    try {
      await this.usageService.enforceRequestLimits({ actor, endpoint });
      return true;
    } catch (error) {
      const limitError = this.usageService.asLimitError(error);
      if (!limitError) throw error;

      await this.usageService.registerLimitHit(
        { actor, endpoint },
        limitError.message,
      );
      res.setHeader('Retry-After', String(limitError.retryAfterSeconds));
      throw new HttpException(
        {
          message: limitError.message,
          retryAfter: limitError.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
