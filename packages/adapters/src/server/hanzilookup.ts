import type {
  HandwritingRecognitionRequestParsed,
  HandwritingRecognitionResult,
} from '@mandarin/contracts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type * as HanziLookup from 'hanzilookup-js';
import type { HandwritingRecognitionPort } from '../ports.js';

// hanzilookup-js keeps its data in a module-level registry; load the CJS build explicitly.
const require = createRequire(import.meta.url);
type HL = typeof HanziLookup;
const hanzi: HL = require('hanzilookup-js') as HL;

const DATA_KEY = 'mmah';

/**
 * Server-side handwriting recognizer (D-029): HanziLookup matcher + Make Me a Hanzi–derived
 * `mmah.json` (Arphic Public License). Runs only on the API so no GPL code ships to browsers.
 * Licence use is pending owner approval. Higher score = better match.
 */
export class HanziLookupRecognizer implements HandwritingRecognitionPort {
  readonly id = 'hanzilookup-mmah';
  private ready = false;

  constructor(dataPath: string) {
    try {
      const raw = JSON.parse(readFileSync(dataPath, 'utf8')) as { substrokes: string };
      hanzi.data[DATA_KEY] = { ...raw, substrokes: hanzi.decodeCompact(raw.substrokes) };
      this.ready = true;
    } catch {
      this.ready = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  recognize(req: HandwritingRecognitionRequestParsed): Promise<HandwritingRecognitionResult> {
    if (!this.ready) return Promise.reject(new Error('Handwriting data not loaded'));
    const started = performance.now();
    const strokes = req.strokes.map((s) => s.points.map((p) => [p.x, p.y]));
    return new Promise((resolve) => {
      new hanzi.Matcher(DATA_KEY).match(
        new hanzi.AnalyzedCharacter(strokes),
        req.limit,
        (matches) => {
          resolve({
            source: 'live',
            adapterId: this.id,
            candidates: matches.map((m) => ({
              text: m.character,
              score: Math.round(m.score * 1000) / 1000,
            })),
            scoreOrder: 'higher_is_better',
            latencyMs: Math.round(performance.now() - started),
          });
        },
      );
    });
  }
}
