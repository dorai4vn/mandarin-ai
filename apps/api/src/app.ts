import { ProviderError } from '@mandarin/adapters';
import cors from '@fastify/cors';
import {
  HandwritingRecognitionRequestSchema,
  PDF_UPLOAD_LIMITS,
  checkPdfSize,
  PronunciationAssessmentRequestSchema,
  SyncPullQuerySchema,
  SyncPushRequestSchema,
  looksLikePdf,
  type ApiError,
  type HealthResponse,
  type PdfUploadResult,
  type SyncPullResponse,
  type SyncPushResponse,
} from '@mandarin/contracts';
import { createHash, randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { authModes, type AuthUser, type TokenVerifier } from './auth.js';
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
    trustProxy: config.TRUST_PROXY === 'true',
    logger: config.NODE_ENV === 'test' ? false : { redact: ['req.headers.authorization'] },
    // 1 MB audio as base64 (~1.37 MB) plus JSON overhead.
    bodyLimit: 1_600_000,
  });
  // Paid provider calls get the strict limit; cheap endpoints a 10x larger one.
  const costLimiter = new FixedWindowLimiter(config.RATE_LIMIT_PER_MINUTE);
  const generalLimiter = new FixedWindowLimiter(config.RATE_LIMIT_PER_MINUTE * 10);

  // Browsers on any platform call the API cross-origin; only the web app origins are allowed.
  const allowOrigin = (origin: string | undefined) =>
    origin !== undefined &&
    (config.webOrigins.includes(origin) || config.webOriginRegex?.test(origin) === true);

  // Preflight flood guard. Preflights are answered by the CORS plugin before the per-IP guard
  // (below), so they would otherwise be unlimited. A separate counter, registered before CORS,
  // caps them per IP without eating the budget of real requests (and vice versa), so a flood of
  // OPTIONS can neither starve real traffic nor make the real request's 429 unreadable. Browsers
  // cache a preflight for `maxAge` (600 s) per URL, so a legitimate client sends few; the limit
  // equals the per-IP request limit. An over-limit preflight gets a bare 429 with no CORS grant:
  // a failed preflight is a network error in the browser whatever its body, so nothing is lost.
  const preflightLimiter = new FixedWindowLimiter(config.IP_RATE_LIMIT_PER_MINUTE);
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'OPTIONS' && !preflightLimiter.take(`preflight:${req.ip}`)) {
      return reply
        .code(429)
        .header('retry-after', '60')
        .send(err('rate_limited', 'Too many requests'));
    }
  });

  // CORS is registered BEFORE the per-IP guard (Fastify runs onRequest hooks in registration
  // order): it answers preflights itself and sets Access-Control-Allow-Origin + Vary: Origin on
  // every response, including the guard's 429. Without that a 429 (or a rate-limited preflight)
  // is unreadable for the browser: fetch() rejects and the web app reports "cannot reach the
  // API" instead of "too many requests" (FU-7, issue #6). Preflights carry no body and do no
  // work beyond this plugin's reply.
  void app.register(cors, {
    origin: (origin, cb) => cb(null, allowOrigin(origin)),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });

  // Per-IP guard for every non-preflight request (including unauthenticated ones), before auth.
  const ipLimiter = new FixedWindowLimiter(config.IP_RATE_LIMIT_PER_MINUTE);
  app.addHook('onRequest', async (req, reply) => {
    if (!ipLimiter.take(`ip:${req.ip}`)) {
      return reply.code(429).send(err('rate_limited', 'Too many requests'));
    }
  });

  app.addContentTypeParser(
    PDF_UPLOAD_LIMITS.mimeType,
    { parseAs: 'buffer', bodyLimit: PDF_UPLOAD_LIMITS.maxBytes },
    (_req, body, done) => done(null, body),
  );

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
    if (!generalLimiter.take(req.user.id)) {
      return reply.code(429).send(err('rate_limited', 'Too many requests'));
    }
  };

  const limitCost = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!costLimiter.take(req.user!.id)) {
      return reply.code(429).send(err('rate_limited', 'Too many requests'));
    }
  };

  // The database rejected the user's token (expired between our check and the call) → 401 so the
  // client refreshes its session; anything else is an upstream failure (never "synced", G1).
  const syncFailure = (reply: FastifyReply, e: unknown) => {
    if (e instanceof ProviderError && e.code === 'unauthorized')
      return reply.code(401).send(err('unauthenticated', 'Invalid or expired token'));
    return providerFailure(reply, e);
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
    environment: config.appEnv,
    auth: authModes(config),
    providers: {
      openaiRealtime: providers.conversation?.mode ?? 'disabled',
      azureSpeech: providers.pronunciation?.mode ?? 'disabled',
      handwriting: providers.handwriting?.mode ?? 'disabled',
      storage: providers.storage?.mode ?? 'disabled',
      sync: providers.sync?.mode ?? 'disabled',
    },
  }));

  app.post(
    '/v1/voice/realtime-session',
    { preHandler: [requireUser, limitCost] },
    async (req, reply) => {
      if (!providers.conversation) {
        return reply
          .code(503)
          .send(err('provider_unavailable', 'Voice sessions are not configured'));
      }
      try {
        return await providers.conversation.port.createSessionGrant({ userId: req.user!.id });
      } catch (e) {
        return providerFailure(reply, e);
      }
    },
  );

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

  app.post('/v1/handwriting/recognize', { preHandler: requireUser }, async (req, reply) => {
    const parsed = HandwritingRecognitionRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send(err('invalid_request', 'Body does not match contract'));
    if (!providers.handwriting) {
      return reply
        .code(503)
        .send(err('provider_unavailable', 'Handwriting recognition is not configured'));
    }
    return providers.handwriting.port.recognize(parsed.data);
  });

  const syncCaller = (req: FastifyRequest) => ({
    userId: req.user!.id,
    // requireUser verified this exact token; the store forwards it so RLS runs as the user.
    accessToken: req.headers.authorization!.slice('Bearer '.length),
  });

  app.post(
    '/v1/sync/push',
    { preHandler: requireUser },
    async (req, reply): Promise<SyncPushResponse | void> => {
      const parsed = SyncPushRequestSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send(err('invalid_request', 'Body does not match contract'));
      if (!providers.sync)
        return reply.code(503).send(err('provider_unavailable', 'Sync store is not configured'));
      try {
        const results = await providers.sync.push(syncCaller(req), parsed.data.operations);
        return { source: providers.sync.mode, results };
      } catch (e) {
        return syncFailure(reply, e);
      }
    },
  );

  app.get(
    '/v1/sync/pull',
    { preHandler: requireUser },
    async (req, reply): Promise<SyncPullResponse | void> => {
      const parsed = SyncPullQuerySchema.safeParse(req.query);
      if (!parsed.success)
        return reply.code(400).send(err('invalid_request', 'Query does not match contract'));
      if (!providers.sync)
        return reply.code(503).send(err('provider_unavailable', 'Sync store is not configured'));
      const { after, limit } = parsed.data;
      try {
        const { operations, hasMore } = await providers.sync.pull(syncCaller(req), after, limit);
        return {
          source: providers.sync.mode,
          operations,
          nextAfter: operations.at(-1)?.serverSeq ?? after,
          hasMore,
        };
      } catch (e) {
        return syncFailure(reply, e);
      }
    },
  );

  app.post(
    '/v1/uploads/pdf',
    {
      // D-040: authenticate in onRequest, BEFORE the (up to 50 MB) body is read, so an anonymous
      // client can never make the server buffer a large upload. Fastify rejects a declared
      // Content-Length above bodyLimit before reading and aborts a stream that grows past it.
      onRequest: requireUser,
      bodyLimit: PDF_UPLOAD_LIMITS.maxBytes,
      errorHandler: (error, _req, reply) => {
        const e = error as { code?: string; statusCode?: number };
        if (e.code === 'FST_ERR_CTP_BODY_TOO_LARGE' || e.statusCode === 413) {
          return reply
            .code(413)
            .send(
              err('payload_too_large', `PDF must be at most ${PDF_UPLOAD_LIMITS.maxBytes} bytes`),
            );
        }
        if (e.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
          return reply
            .code(415)
            .send(err('unsupported_media_type', 'Only application/pdf is accepted'));
        }
        app.log.error({ code: e.code }, 'upload failed');
        return reply
          .code(e.statusCode && e.statusCode < 500 ? e.statusCode : 500)
          .send(err('upload_failed', 'Upload failed'));
      },
    },
    async (req, reply) => {
      if (
        req.headers['content-type'] !== PDF_UPLOAD_LIMITS.mimeType ||
        !Buffer.isBuffer(req.body)
      ) {
        return reply
          .code(415)
          .send(err('unsupported_media_type', 'Only application/pdf is accepted'));
      }
      const body = req.body;
      if (checkPdfSize(body.length) === 'too_large') {
        return reply.code(413).send(err('payload_too_large', 'PDF is larger than allowed'));
      }
      if (body.length === 0 || !looksLikePdf(body.subarray(0, 5))) {
        return reply.code(422).send(err('not_a_pdf', 'File content is not a PDF'));
      }
      if (!providers.storage)
        return reply.code(503).send(err('provider_unavailable', 'Storage is not configured'));
      // Server-chosen path: the client never decides where private files go.
      const storagePath = `${req.user!.id}/imports/${randomUUID()}.pdf`;
      try {
        await providers.storage.put(storagePath, body, PDF_UPLOAD_LIMITS.mimeType);
      } catch (e) {
        return providerFailure(reply, e);
      }
      const result: PdfUploadResult = {
        source: providers.storage.mode,
        storagePath,
        sizeBytes: body.length,
        sha256: createHash('sha256').update(body).digest('hex'),
      };
      return reply.code(201).send(result);
    },
  );

  return app;
}
