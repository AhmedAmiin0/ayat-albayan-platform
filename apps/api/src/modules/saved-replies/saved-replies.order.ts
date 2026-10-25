import { byPosition, type SavedReplyRow } from './saved-replies.mapper';

/**
 * The new positions after moving `id` one place up or down in its list (by position, then title):
 * the whole list renumbered 0…n−1, only the rows whose position changes. Already first (up) or last
 * (down), or not in the list: nothing changes. Pure.
 */
export function movedOrder(input: { rows: readonly SavedReplyRow[]; id: string; direction: 'up' | 'down' }): { id: string; position: number }[] {
  const order = [...input.rows].sort(byPosition);
  const at = order.findIndex((r) => r.id === input.id);
  const to = input.direction === 'up' ? at - 1 : at + 1;
  const moving = order[at];
  const other = order[to];
  if (at < 0 || !moving || !other) return [];
  order[at] = other;
  order[to] = moving;
  return order.map((r, position) => ({ id: r.id, position })).filter((r, i) => order[i]?.position !== r.position);
}
