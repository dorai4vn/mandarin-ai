import type { Course, Lexeme } from '@mandarin/contracts';
import { ProviderError, type ContentStore, type FetchLike, type SyncCaller } from '../ports.js';

export interface SupabaseContentConfig {
  url: string;
  publishableKey: string;
  fetch?: FetchLike;
}

type Row = Record<string, unknown>;

/**
 * Shared content from Postgres (M2) through PostgREST with the CALLER's token: RLS grants learners
 * read-only access to published content. Five flat reads, assembled here.
 */
export class SupabaseContentStore implements ContentStore {
  readonly mode = 'live' as const;
  private readonly fetchImpl: FetchLike;
  private readonly base: string;
  constructor(private readonly config: SupabaseContentConfig) {
    this.fetchImpl = config.fetch ?? fetch;
    this.base = `${config.url.replace(/\/$/, '')}/rest/v1`;
  }

  private async get(caller: SyncCaller, path: string): Promise<Row[]> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}/${path}`, {
        headers: {
          apikey: this.config.publishableKey,
          Authorization: `Bearer ${caller.accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ProviderError('supabase-content', 'unreachable', 'Content database unreachable');
    }
    if (res.status === 401 || res.status === 403)
      throw new ProviderError('supabase-content', 'unauthorized', 'Token rejected', 401);
    if (!res.ok)
      throw new ProviderError('supabase-content', 'failed', `HTTP ${res.status}`, res.status);
    const body = (await res.json()) as unknown;
    if (!Array.isArray(body))
      throw new ProviderError('supabase-content', 'bad_response', 'Unexpected response');
    return body as Row[];
  }

  async version(caller: SyncCaller): Promise<string> {
    const [row] = await this.get(caller, 'content_version?select=version');
    return String(row?.version ?? 'empty');
  }

  async snapshot(caller: SyncCaller) {
    const [version, lexemes, courses, chapters, lessons, links] = await Promise.all([
      this.version(caller),
      this.get(
        caller,
        'lexemes?select=id,simplified,traditional,pinyin,meaning_vi,example,example_vi&order=id',
      ),
      this.get(caller, 'courses?select=id,title,level,description,provenance&order=title'),
      this.get(caller, 'chapters?select=id,course_id,ordinal,title&order=ordinal'),
      this.get(caller, 'lessons?select=id,chapter_id,ordinal,title&order=ordinal'),
      this.get(caller, 'lesson_lexemes?select=lesson_id,lexeme_id,ordinal&order=ordinal'),
    ]);
    const lexemeList: Lexeme[] = lexemes.map((r) => ({
      id: String(r.id),
      simplified: String(r.simplified),
      traditional: (r.traditional as string | null) ?? null,
      pinyin: String(r.pinyin),
      meaningVi: String(r.meaning_vi),
      example: (r.example as string | null) ?? null,
      exampleVi: (r.example_vi as string | null) ?? null,
    }));
    const courseList: Course[] = courses.map((c) => ({
      id: String(c.id),
      title: String(c.title),
      level: String(c.level ?? ''),
      description: String(c.description ?? ''),
      provenance: String(c.provenance),
      chapters: chapters
        .filter((ch) => ch.course_id === c.id)
        .map((ch) => ({
          id: String(ch.id),
          ordinal: Number(ch.ordinal),
          title: String(ch.title),
          lessons: lessons
            .filter((l) => l.chapter_id === ch.id)
            .map((l) => ({
              id: String(l.id),
              ordinal: Number(l.ordinal),
              title: String(l.title),
              lexemeIds: links.filter((k) => k.lesson_id === l.id).map((k) => String(k.lexeme_id)),
            })),
        })),
    }));
    return { version, lexemes: lexemeList, courses: courseList };
  }
}
