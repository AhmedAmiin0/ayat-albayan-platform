import type { MessageView } from '@ab/shared';
import type { ViewToken } from 'react-native';
import { dayLabel } from './day-label';
import { separatorsOf, topmost } from './day-separators';
import { CHIP_MARGIN } from './top-band';
import { message } from '../../shared/thread-fixtures';

// The separators on screen, from the rows as they are now (owner 2026-10-27: the floating day).
const at = (id: string, created_at: string, direction: 'inbound' | 'outbound' = 'inbound') =>
  message({ id, direction, body: id, created_at });
const C = at('c', '2026-10-02T08:00:00Z', 'outbound');
const B = at('b', '2026-09-29T16:39:00Z');
const A = at('a', '2026-09-29T10:00:00Z');
const ROWS = [C, B, A]; // newest first
const token = (item: MessageView, index: number): ViewToken<MessageView> => ({
  item,
  index,
  key: item.id,
  isViewable: true,
});
const all = ROWS.map(token);

test('a separator for each row that opens its day, its chip a gap and a margin down', () => {
  expect(separatorsOf({ rows: ROWS, more: false }, all)).toEqual([
    { key: 'c', label: dayLabel(C.created_at), inset: 8 + CHIP_MARGIN }, // the side changes: 8pt
    { key: 'a', label: dayLabel(A.created_at), inset: CHIP_MARGIN }, // the oldest: no gap
  ]);
});

test('the oldest loaded row has none while an older page may continue its day', () => {
  expect(separatorsOf({ rows: ROWS, more: true }, all).map((s) => s.key)).toEqual(['c']);
});

test('a token whose index no longer holds its message (rows moved) is skipped', () => {
  const moved = [at('n', '2026-10-03T08:00:00Z'), ...ROWS];
  expect(separatorsOf({ rows: moved, more: false }, all)).toEqual([]);
  expect(
    separatorsOf({ rows: ROWS, more: false }, [
      { ...all[0], index: null } as ViewToken<MessageView>,
    ]),
  ).toEqual([]);
});

test('topmost: the highest index on screen, or none', () => {
  expect(
    topmost([all[0], all[2], all[1]].filter((v): v is ViewToken<MessageView> => v !== undefined)),
  ).toBe(A);
  expect(topmost([])).toBeNull();
});
