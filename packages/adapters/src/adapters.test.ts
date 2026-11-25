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
  SupabaseSyncStore,
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
  const A = { userId: 'user-a', accessToken: 'token-a' };
  const B = { userId: 'user-b', accessToken: 'token-b' };

  it('memory sync store is idempotent per operation id and rejects cross-user reuse', async () => {
    const store = new MemorySyncOperationStore();
    expect((await store.push(A, [op]))[0]!.status).toBe('applied');
    expect((await store.push(A, [op]))[0]!.status).toBe('duplicate');
    const rej = (await store.push(B, [op]))[0]!;
    expect(rej).toMatchObject({ status: 'rejected', serverVersion: null });
    expect(store.countFor('user-a')).toBe(1);
    const tiny = new MemorySyncOperationStore(1);
    await tiny.push(A, [op]);
    expect(
      (await tiny.push(A, [{ ...op, operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0Z' }]))[0]!.error,
    ).toBe('mock_store_full');
  });

  it("memory sync store pulls only the caller's operations, in order, with a cursor", async () => {
    const store = new MemorySyncOperationStore();
    const ids = [
      '01JD8Z6Q9K2V4N7P3R5T8W1Y01',
      '01JD8Z6Q9K2V4N7P3R5T8W1Y02',
      '01JD8Z6Q9K2V4N7P3R5T8W1Y03',
    ];
    await store.push(A, [{ ...op, operationId: ids[0]! }]);
    await store.push(B, [{ ...op, operationId: ids[1]! }]);
    await store.push(A, [{ ...op, operationId: ids[2]! }]);
    const first = await store.pull(A, 0, 1);
    expect(first.operations.map((o) => o.operationId)).toEqual([ids[0]]);
    expect(first.hasMore).toBe(true);
    const rest = await store.pull(A, first.operations[0]!.serverSeq, 10);
    expect(rest.operations.map((o) => o.operationId)).toEqual([ids[2]]);
    expect(rest.hasMore).toBe(false);
    expect((await store.pull(B, 0, 10)).operations.map((o) => o.operationId)).toEqual([ids[1]]);
  });

  it('supabase sync store calls PostgREST with the USER token and the publishable key only', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init! });
      if (url.includes('/rpc/sync_push')) {
        return Response.json([
          { operation_id: op.operationId, status: 'applied', server_seq: 7 },
          { operation_id: 'other', status: 'rejected', server_seq: null },
        ]);
      }
      return Response.json([
        {
          operation_id: op.operationId,
          device_id: op.deviceId,
          entity_type: 'spike_note',
          op_type: 'create',
          schema_version: 1,
          logical_clock: 1,
          occurred_at: '2026-11-23T03:00:00+00:00',
          payload: { text: 'x' },
          server_seq: 7,
        },
      ]);
    });
    const s = new SupabaseSyncStore({
      url: 'https://x.supabase.co/',
      publishableKey: 'sb_publishable_test',
      fetch: fetchMock,
    });
    const res = await s.push(A, [op, { ...op, operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0B' }]);
    expect(res).toEqual([
      { operationId: op.operationId, status: 'applied', serverVersion: 7, error: null },
      {
        operationId: '01JD8Z6Q9K2V4N7P3R5T8W1Y0B',
        status: 'rejected',
        serverVersion: null,
        error: 'operation_id_conflict',
      },
    ]);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(calls[0]!.url).toBe('https://x.supabase.co/rest/v1/rpc/sync_push');
    expect(headers.Authorization).toBe('Bearer token-a');
    expect(headers.apikey).toBe('sb_publishable_test');
    expect(JSON.stringify(headers)).not.toContain('sb_secret');

    const pulled = await s.pull(A, 3, 1);
    const url = new URL(calls[1]!.url);
    expect(url.pathname).toBe('/rest/v1/sync_operations');
    expect(url.searchParams.get('user_id')).toBe('eq.user-a');
    expect(url.searchParams.get('server_seq')).toBe('gt.3');
    expect(url.searchParams.get('order')).toBe('server_seq.asc');
    expect(url.searchParams.get('limit')).toBe('2');
    expect(pulled.operations[0]).toMatchObject({ operationId: op.operationId, serverSeq: 7 });
    expect(pulled.hasMore).toBe(false);
  });

  it('supabase sync store maps a rejected token to 401 and other failures to provider errors', async () => {
    const mk = (status: number) =>
      new SupabaseSyncStore({
        url: 'https://x.supabase.co',
        publishableKey: 'sb_publishable_test',
        fetch: async () => new Response('{}', { status }),
      });
    await expect(mk(401).push(A, [op])).rejects.toMatchObject({
      code: 'unauthorized',
      status: 401,
    });
    await expect(mk(500).pull(A, 0, 10)).rejects.toMatchObject({ code: 'failed' });
    const short = new SupabaseSyncStore({
      url: 'https://x.supabase.co',
      publishableKey: 'k',
      fetch: async () => Response.json([]),
    });
    await expect(short.push(A, [op])).rejects.toMatchObject({ code: 'bad_response' });
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
