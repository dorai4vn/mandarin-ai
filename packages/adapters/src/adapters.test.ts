import { describe, expect, it, vi } from 'vitest';
import {
  MemorySyncOperationStore,
  MockConversation,
  MockDigitalInk,
  MockHandwritingRecognizer,
  MockPronunciationAssessment,
} from './index.js';
import {
  AzurePronunciationAssessment,
  OpenAIRealtimeSessions,
  SupabaseObjectStorage,
  storageAuthHeaders,
  buildPronunciationHeader,
  mapAzureResponse,
} from './server.js';

describe('mock adapters are always labelled', () => {
  it('returns source=mock and never invents pronunciation scores', async () => {
    const ink = await new MockDigitalInk().recognize({
      languageTag: 'zh-Hani-CN',
      strokes: [{ points: [{ x: 0, y: 0, t: 0 }] }],
    });
    expect(ink.source).toBe('mock');
    const pa = await new MockPronunciationAssessment().assess({
      referenceText: '山',
      locale: 'zh-CN',
      audioBase64: 'AA==',
    });
    expect(pa.source).toBe('mock');
    expect(Object.values(pa.scores).every((v) => v === null)).toBe(true);
    expect((await new MockConversation().createSessionGrant()).source).toBe('mock');
  });
});

describe('Azure pronunciation adapter', () => {
  it('encodes the assessment header as base64 JSON with the reference text', () => {
    const decoded = JSON.parse(Buffer.from(buildPronunciationHeader('你好'), 'base64').toString());
    expect(decoded.ReferenceText).toBe('你好');
    expect(decoded.GradingSystem).toBe('HundredMark');
  });

  it('maps provider scores and keeps missing dimensions null', () => {
    const r = mapAzureResponse({
      RecognitionStatus: 'Success',
      NBest: [
        {
          Display: '山。',
          PronunciationAssessment: { AccuracyScore: 92, FluencyScore: 88, PronScore: 90 },
          Words: [
            { Word: '山', PronunciationAssessment: { AccuracyScore: 92, ErrorType: 'None' } },
          ],
        },
      ],
    });
    expect(r.source).toBe('live');
    expect(r.scores).toEqual({
      accuracy: 92,
      fluency: 88,
      completeness: null,
      prosody: null,
      pronunciation: 90,
    });
    expect(r.words).toEqual([{ word: '山', accuracy: 92, errorType: 'None' }]);
  });

  it('calls the regional endpoint with the key header and rejects oversize audio', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ RecognitionStatus: 'Success', NBest: [] })),
    );
    const adapter = new AzurePronunciationAssessment({
      key: 'k',
      region: 'southeastasia',
      fetch: fetchMock,
    });
    await adapter.assess({
      referenceText: '山',
      locale: 'zh-CN',
      audioBase64: Buffer.from('RIFF').toString('base64'),
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('https://southeastasia.stt.speech.microsoft.com/');
    expect(url).toContain('language=zh-CN');
    expect((init.headers as Record<string, string>)['Ocp-Apim-Subscription-Key']).toBe('k');
    await expect(
      adapter.assess({
        referenceText: '山',
        locale: 'zh-CN',
        audioBase64: Buffer.alloc(1_000_001).toString('base64'),
      }),
    ).rejects.toThrow(/too large/);
    expect(() => new AzurePronunciationAssessment({ key: 'k', region: 'evil.com/x' })).toThrow();
  });
});

describe('OpenAI realtime client secret adapter', () => {
  it('posts to /v1/realtime/client_secrets and maps the grant', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ value: 'ek_test', expires_at: 1_800_000_000 })),
    );
    const adapter = new OpenAIRealtimeSessions({
      apiKey: 'sk-x',
      model: 'gpt-realtime',
      ttlSeconds: 99999,
      fetch: fetchMock,
    });
    const grant = await adapter.createSessionGrant({ userId: 'u' });
    expect(grant).toEqual({
      source: 'live',
      clientSecret: 'ek_test',
      expiresAt: new Date(1_800_000_000_000).toISOString(),
      model: 'gpt-realtime',
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/realtime/client_secrets');
    expect(JSON.parse(init.body as string).expires_after.seconds).toBe(7200);
  });

  it('throws a ProviderError on non-2xx', async () => {
    const adapter = new OpenAIRealtimeSessions({
      apiKey: 'sk-x',
      model: 'gpt-realtime',
      fetch: async () => new Response('nope', { status: 401 }),
    });
    await expect(adapter.createSessionGrant({ userId: 'u' })).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('cross-platform handwriting + sync/storage mocks', () => {
  it('mock recognizer is labelled and respects limit', async () => {
    const r = await new MockHandwritingRecognizer().recognize({
      strokes: [{ points: [{ x: 0, y: 0, t: 0 }] }],
      pointerType: 'mouse',
      limit: 2,
    });
    expect(r).toMatchObject({ source: 'mock', adapterId: 'mock' });
    expect(r.candidates).toHaveLength(2);
  });

  it('memory sync store is idempotent per operation id and rejects cross-user reuse', async () => {
    const store = new MemorySyncOperationStore();
    const op = {
      operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0A',
      deviceId: 'device-12345678',
      entityType: 'spike_note',
      opType: 'create' as const,
      schemaVersion: 1,
      logicalClock: 1,
      occurredAt: '2026-11-23T10:00:00+07:00',
      payload: {},
    };
    expect((await store.apply('user-a', op)).status).toBe('applied');
    expect((await store.apply('user-a', op)).status).toBe('duplicate');
    expect((await store.apply('user-b', op)).status).toBe('rejected');
    expect(store.countFor('user-a')).toBe(1);
    const tiny = new MemorySyncOperationStore(1);
    await tiny.apply('u', op);
    expect(
      (await tiny.apply('u', { ...op, operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0Z' })).error,
    ).toBe('mock_store_full');
  });

  it('supabase storage writes to the private bucket path and rejects traversal', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const s = new SupabaseObjectStorage({
      url: 'https://x.supabase.co/',
      secretKey: 'sb_secret_test',
      bucket: 'documents',
      fetch: fetchMock,
    });
    await s.put('u/abc.pdf', new Uint8Array([1]), 'application/pdf');
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://x.supabase.co/storage/v1/object/documents/u/abc.pdf',
    );
    await expect(s.put('../etc/passwd', new Uint8Array([1]), 'application/pdf')).rejects.toThrow();
  });
});

describe('Supabase Storage auth headers (new vs legacy keys)', () => {
  it('sends sb_secret_ keys only in the apikey header (they are not JWTs)', () => {
    const h = storageAuthHeaders('sb_secret_abc', 'application/pdf');
    expect(h.apikey).toBe('sb_secret_abc');
    expect(h.Authorization).toBeUndefined();
  });

  it('also sends legacy service_role JWTs as Bearer', () => {
    const h = storageAuthHeaders('eyJhbGciOiJIUzI1NiJ9.x.y', 'application/pdf');
    expect(h.apikey).toBe('eyJhbGciOiJIUzI1NiJ9.x.y');
    expect(h.Authorization).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.x.y');
  });
});

describe('MemoryObjectStorage bound (D-040, development only)', () => {
  it('evicts the oldest objects once the byte budget is exceeded', async () => {
    const { MemoryObjectStorage } = await import('./mock/index.js');
    const store = new MemoryObjectStorage(100);
    await store.put('a', new Uint8Array(40), 'application/pdf');
    await store.put('b', new Uint8Array(40), 'application/pdf');
    await store.put('c', new Uint8Array(40), 'application/pdf');
    expect([...store.objects.keys()]).toEqual(['b', 'c']);
    expect(store.storedBytes).toBe(80);
    await store.put('big', new Uint8Array(150), 'application/pdf');
    expect([...store.objects.keys()]).toEqual(['big']);
  });
});

describe('Supabase Storage size errors (D-040)', () => {
  const store = (res: Response) =>
    new SupabaseObjectStorage({
      url: 'https://x.supabase.co',
      secretKey: 'sb_secret_test',
      bucket: 'documents',
      fetch: vi.fn(async () => res),
    });

  it.each([
    ['HTTP 413', new Response('', { status: 413 })],
    [
      'HTTP 400 with statusCode "413"',
      new Response('{"statusCode":"413","error":"Payload too large","message":"x"}', {
        status: 400,
      }),
    ],
  ])('reports %s as status 413', async (_label, res) => {
    await expect(
      store(res).put('u/a.pdf', new Uint8Array([1]), 'application/pdf'),
    ).rejects.toMatchObject({ status: 413 });
  });

  it('keeps other failures as they are', async () => {
    await expect(
      store(new Response('{"statusCode":"403","error":"Unauthorized"}', { status: 400 })).put(
        'u/a.pdf',
        new Uint8Array([1]),
        'application/pdf',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
