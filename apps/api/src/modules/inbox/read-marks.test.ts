import { describe, expect, it } from 'vitest';
import { newestPerLine } from './read-marks';

const row = (wa: string | null, at: string, line: 'notifications' | 'chat' | null) => ({
  wa_message_id: wa,
  created_at: `2026-10-10T08:0${at}:00Z`,
  line,
});

describe('newestPerLine (docs/12 §13.7)', () => {
  it('the newest unread inbound of each line, whatever the row order', () => {
    const marks = newestPerLine([row('n1', '1', 'notifications'), row('c2', '4', 'chat'), row('n2', '3', 'notifications'), row('c1', '2', 'chat')]);
    expect(marks).toHaveLength(2);
    expect(marks).toEqual(expect.arrayContaining([{ waMessageId: 'n2', line: 'notifications' }, { waMessageId: 'c2', line: 'chat' }]));
  });

  it('a null line is notifications and merges with the notifications rows', () => {
    expect(newestPerLine([row('n1', '1', 'notifications'), row('old', '2', null)])).toEqual([{ waMessageId: 'old', line: 'notifications' }]);
    expect(newestPerLine([row('old', '1', null), row('n1', '2', 'notifications')])).toEqual([{ waMessageId: 'n1', line: 'notifications' }]);
  });

  it('a row without a wamid is skipped (an older row of that line still counts)', () => {
    expect(newestPerLine([row('c1', '1', 'chat'), row(null, '2', 'chat')])).toEqual([{ waMessageId: 'c1', line: 'chat' }]);
    expect(newestPerLine([row(null, '1', null)])).toEqual([]);
  });

  it('nothing unread → no marks', () => {
    expect(newestPerLine([])).toEqual([]);
  });
});
