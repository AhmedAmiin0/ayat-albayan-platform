// «ترتيب البديل» (docs/23c decision 9). Pure.

export const RANK_MIN = 0;
export const RANK_MAX = 999;

/** The typed rank as the API accepts it (an integer 0–999), else null. */
export function parseRank(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) return null;
  const rank = Number(trimmed);
  return rank >= RANK_MIN && rank <= RANK_MAX ? rank : null;
}
