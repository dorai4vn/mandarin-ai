// Candidate filename -> (character, script) mapping from the Commons "Ancient Chinese characters
// project" naming convention (project page oldid 1251989808, verified by GPT: -oracle, -bronze,
// -bronze-shang, -bronze-spring, -bronze-warring, -silk, -slip, -seal, ...).
//
// A candidate is NEVER historical evidence. It is a naming-convention guess that stays
// `pending-review` until a human curator approves it. The project distinguishes historically
// accurate files from teaching representations; the file name cannot tell which, so
// `representation` is always 'unknown' here. Per-file licence is evaluated separately.

/** Documented suffixes only. Anything else is reported as unrecognised, never guessed. */
export const SCRIPT_SUFFIXES = Object.freeze({
  oracle: { script: 'oracle', period: null },
  bronze: { script: 'bronze', period: null },
  'bronze-shang': { script: 'bronze', period: 'shang' },
  'bronze-spring': { script: 'bronze', period: 'spring-autumn' },
  'bronze-warring': { script: 'bronze', period: 'warring-states' },
  silk: { script: 'silk', period: null },
  slip: { script: 'slip', period: null },
  seal: { script: 'seal', period: null },
});

export const PILOT_CHARACTERS = Object.freeze([...'山水木火日月人雨魚鳥']);

const FILE_RE = /^(?:File:)?(\p{Script=Han})-([a-z-]+)\.svg$/u;

/** Parse "File:山-oracle.svg" -> candidate, or null if the title does not follow the convention. */
export function parseCandidateTitle(title) {
  const m = FILE_RE.exec(String(title));
  if (!m) return null;
  const spec = SCRIPT_SUFFIXES[m[2]];
  if (!spec) return { title, character: m[1], suffix: m[2], recognised: false };
  return {
    title,
    character: m[1],
    suffix: m[2],
    recognised: true,
    script: spec.script,
    period: spec.period,
    status: 'pending-review',
    representation: 'unknown', // historically accurate vs teaching: not derivable from the name
    isEvidence: false,
  };
}

/** All documented-convention titles to look up for the given characters (deterministic order). */
export function candidateTitles(chars = PILOT_CHARACTERS) {
  const out = [];
  for (const c of [...new Set(chars)].sort())
    for (const s of Object.keys(SCRIPT_SUFFIXES).sort()) out.push(`File:${c}-${s}.svg`);
  return out;
}

/**
 * Pure coverage report. Three separate counts, never conflated:
 *  - candidates: titles that exist on Commons and match the convention (naming guess only)
 *  - eligible:   candidates whose file passed licence/provenance/sanitize checks
 *  - curated:    characters with a human-approved mapping (`curations`: [{title, reviewer}])
 * Only curated characters may be presented as having historical stages.
 */
export function coverageReport({
  chars = PILOT_CHARACTERS,
  existing = [],
  eligible = [],
  curations = [],
  rejected = [],
}) {
  const want = new Set(chars);
  const cand = existing
    .map(parseCandidateTitle)
    .filter((c) => c?.recognised && want.has(c.character));
  const eligibleTitles = new Set(eligible.map((e) => e.title));
  const approved = new Set(
    curations
      .filter((c) => c && c.title && typeof c.reviewer === 'string' && c.reviewer)
      .map((c) => c.title),
  );
  const rejectedBy = Object.fromEntries(rejected.map((r) => [r.title, r.reason]));
  const perCharacter = {};
  for (const c of [...want].sort()) {
    const mine = cand.filter((x) => x.character === c);
    const elig = mine.filter((x) => eligibleTitles.has(x.title));
    const cur = elig.filter((x) => approved.has(x.title));
    perCharacter[c] = {
      candidates: mine.map((x) => x.suffix).sort(),
      eligible: elig.map((x) => x.suffix).sort(),
      curated: cur.map((x) => x.suffix).sort(),
      rejected: mine
        .filter((x) => rejectedBy[x.title])
        .map((x) => ({ suffix: x.suffix, reason: rejectedBy[x.title] })),
    };
  }
  const withAny = (k) => Object.values(perCharacter).filter((v) => v[k].length > 0).length;
  return {
    pilotSize: want.size,
    candidateFiles: cand.length,
    eligibleFiles: cand.filter((x) => eligibleTitles.has(x.title)).length,
    curatedFiles: cand.filter((x) => eligibleTitles.has(x.title) && approved.has(x.title)).length,
    charactersWithCandidates: withAny('candidates'),
    charactersWithEligible: withAny('eligible'),
    curatedCharacters: withAny('curated'),
    note: 'candidates are filename guesses (pending review); only curatedCharacters count as curated',
    perCharacter,
  };
}
