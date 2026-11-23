import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  providers: z.object({
    openaiRealtime: z.enum(['live', 'mock']),
    azureSpeech: z.enum(['live', 'mock']),
  }),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
