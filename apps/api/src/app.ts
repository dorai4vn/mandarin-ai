import { ProviderError } from '@mandarin/adapters';
import {
  PronunciationAssessmentRequestSchema,
  type ApiError,
  type HealthResponse,
} from '@mandarin/contracts';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { AuthUser, TokenVerifier } from './auth.js';
import type { AppConfig } from './config.js';
import type { Providers } from './providers.js';
import { FixedWindowLimiter } from './rate-limit.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export interface AppDeps {
  config: AppConfig;
  verifyToken: TokenVerifier;
  providers: Providers;
}

const err = (code: string, message: string): ApiError => ({ error: { code, message } });

export function buildApp({ config, verifyToken, providers }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { redact: ['req.headers.authorization'] },
    // 1 MB audio as base64 (~1.37 MB) plus JSON overhead.
    bodyLimit: 1_600_000,
  });
  const limiter = new FixedWindowLimiter(config.RATE_LIMIT_PER_MINUTE);

  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send(err('unauthenticated', 'Missing bearer token'));
    }
    try {
      req.user = await verifyToken(header.slice('Bearer '.length));
    } catch {
      return reply.code(401).send(err('unauthenticated', 'Invalid or expired token'));
    }
    if (!limiter.take(req.user.id)) {
      return reply.code(429).send(err('rate_limited', 'Too many requests'));
    }
  };

  const providerFailure = (reply: FastifyReply, e: unknown) => {
    if (e instanceof ProviderError) {
      app.log.warn({ provider: e.provider, code: e.code, status: e.status }, 'provider error');
      const status = e.status === 413 ? 413 : 502;
      return reply.code(status).send(err(`provider_${e.code}`, 'Upstream provider failed'));
    }
    throw e;
  };

  app.get('/health', async (): Promise<HealthResponse> => ({
    status: 'ok',
    version: config.version,
    providers: {
      openaiRealtime: providers.conversation?.mode === 'live' ? 'live' : 'mock',
      azureSpeech: providers.pronunciation?.mode === 'live' ? 'live' : 'mock',
    },
  }));

  app.post('/v1/voice/realtime-session', { preHandler: requireUser }, async (req, reply) => {
    if (!providers.conversation) {
      return reply.code(503).send(err('provider_unavailable', 'Voice sessions are not configured'));
    }
    try {
      return await providers.conversation.port.createSessionGrant({ userId: req.user!.id });
    } catch (e) {
      return providerFailure(reply, e);
    }
  });

  app.post(
    '/v1/speech/pronunciation-assessment',
    { preHandler: requireUser },
    async (req, reply) => {
      const parsed = PronunciationAssessmentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send(err('invalid_request', 'Body does not match contract'));
      }
      if (!providers.pronunciation) {
        return reply
          .code(503)
          .send(err('provider_unavailable', 'Pronunciation assessment is not configured'));
      }
      try {
        return await providers.pronunciation.port.assess(parsed.data);
      } catch (e) {
        return providerFailure(reply, e);
      }
    },
  );

  return app;
}
