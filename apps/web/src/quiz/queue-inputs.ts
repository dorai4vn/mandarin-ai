import { SESSION_LIMITS, buildQueue, type SessionMode } from '@mandarin/domain';
import type { LocalStore } from '@/offline/store';

/**
 * Builds a session's word ids from the local store. The number of store calls is a constant of the
 * mode (2, or 3 for recall) — never a function of how many cards exist (no N+1) — and orphan cards
 * (word deleted or not this account's) are excluded by the store before the limit is applied.
 */
export async function buildSessionIds(
  store: LocalStore,
  mode: SessionMode,
  today: string,
  skill: string,
  liveItemIds: ReadonlySet<string>,
  newCandidates: readonly string[],
): Promise<string[]> {
  const [carded, dueCards, allCards] = await Promise.all([
    store.cardedItemIds(skill),
    store.dueCards(today, skill, SESSION_LIMITS.due * 2),
    mode === 'recall' ? store.listCards() : Promise.resolve(undefined),
  ]);
  return buildQueue({
    mode,
    today,
    dueCards: dueCards.filter((c) => liveItemIds.has(c.vocabularyItemId)),
    allCards: allCards?.filter((c) => c.skill === skill && liveItemIds.has(c.vocabularyItemId)),
    newItemIds: newCandidates.filter((id) => !carded.has(id)),
  });
}
