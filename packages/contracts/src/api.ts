import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  environment: z.enum(['development', 'preview', 'production']),
  providers: z.object({
    openaiRealtime: z.enum(['live', 'mock', 'disabled']),
    azureSpeech: z.enum(['live', 'mock', 'disabled']),
    handwriting: z.enum(['live', 'mock', 'disabled']),
    storage: z.enum(['live', 'mock', 'disabled']),
    sync: z.enum(['live', 'mock', 'disabled']),
  }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
