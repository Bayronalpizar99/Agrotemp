import { SetMetadata } from '@nestjs/common';

export type GeminiEndpointType = 'chat' | 'report';

export const GEMINI_ENDPOINT_KEY = 'gemini_endpoint';

export const GeminiEndpoint = (endpoint: GeminiEndpointType) =>
  SetMetadata(GEMINI_ENDPOINT_KEY, endpoint);
