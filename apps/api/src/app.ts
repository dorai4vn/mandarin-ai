import { ProviderError } from '@mandarin/adapters';
import cors from '@fastify/cors';
import {
  HandwritingRecognitionRequestSchema,
  PDF_UPLOAD_LIMITS,
  checkPdfSize,
  PronunciationAssessmentRequestSchema,
  SyncPushRequestSchema,
  looksLikePdf,
  type ApiError,
  type HealthResponse,
  type PdfUploadResult,
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

  // Per-IP guard for every request (including unauthenticated ones), before any other work.
  // It runs before the CORS plugin's hook, so the 429 sets the CORS headers itself for allowed
  // origins: without them the browser cannot read the response, fetch() rejects and the web app
  // reports "cannot reach the API" instead of "too many requests" (FU-7, issue #6).
  const ipLimiter = new FixedWindowLimiter(config.IP_RATE_LIMIT_PER_MINUTE);
  app.addHook('onRequest', async (req, reply) => {
    if (!ipLimiter.take(`ip:${req.ip}`)) {
      const origin = req.headers.origin;
      if (allowOrigin(origin)) {
        void reply.header('Access-Control-Allow-Origin', origin).header('Vary', 'Origin');
      }
      return reply.code(429).send(err('rate_limited', 'Too many requests'));
    }
  });
  void app.register(cors, {
    origin: (origin, cb) => cb(null, allowOrigin(origin)),
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
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

  app.post(
    '/v1/sync/push',
    { preHandler: requireUser },
    async (req, reply): Promise<SyncPushResponse | void> => {
      const parsed = SyncPushRequestSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send(err('invalid_request', 'Body does not match contract'));
      if (!providers.sync)
        return reply.code(503).send(err('provider_unavailable', 'Sync store is not configured'));
      const results = [];
      for (const op of parsed.data.operations) {
        const r = await providers.sync.apply(req.user!.id, op);
        results.push({ operationId: op.operationId, ...r });
      }
      return { source: providers.sync.mode, results };
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
