import { describe, expect, it } from 'vitest';
import { minutesLeft, msUntilClose, reportSendState, SENDING_FOR_MS } from './send-state.js';

const UNTIL = '2026-11-11T10:30:00.000Z';
const at = (iso: string) => new Date(iso);
const submitted = { status: 'submitted' as const, sent_at: null, edit_until: UNTIL };

describe('reportSendState (docs/46 D5, B5)', () => {
  it.each([
    ['inside the window', '2026-11-11T10:29:59Z', 'window'],
    ['the close instant: being sent', '2026-11-11T10:30:00Z', 'sending'],
    ['nine minutes after the close: still being sent', '2026-11-11T10:39:00Z', 'sending'],
    ['long after the close and never sent (rule off, failed PDF)', '2026-11-11T12:00:00Z', 'none'],
  ] as const)('%s → %s', (_name, now, state) => {
    expect(reportSendState(submitted, at(now))).toBe(state);
  });

  it('sent_at set: sent, whatever the clock says', () => {
    const sent = { ...submitted, sent_at: '2026-11-11T10:31:00Z' };
    expect(reportSendState(sent, at('2026-11-11T10:31:30Z'))).toBe('sent');
    expect(reportSendState(sent, at('2026-11-11T10:10:00Z'))).toBe('sent');
  });

  it('a draft, and an old cached row without the window fields: none', () => {
    expect(reportSendState({ status: 'draft', sent_at: null, edit_until: null }, at(UNTIL))).toBe('none');
    expect(reportSendState({ status: 'submitted' }, at(UNTIL))).toBe('none');
  });

  it('a window of 0 minutes (edit_until = first submit): being sent at once', () => {
    expect(reportSendState(submitted, at(UNTIL))).toBe('sending');
    expect(SENDING_FOR_MS).toBe(600_000);
  });
});

describe('minutesLeft / msUntilClose', () => {
  it('rounds up while the window is open, 0 / null once it has passed or is unknown', () => {
    expect(minutesLeft(UNTIL, at('2026-11-11T10:00:00Z'))).toBe(30);
    expect(minutesLeft(UNTIL, at('2026-11-11T10:29:01Z'))).toBe(1);
    expect(minutesLeft(UNTIL, at(UNTIL))).toBe(0);
    expect(minutesLeft(null, at(UNTIL))).toBe(0);
    expect(msUntilClose(UNTIL, at('2026-11-11T10:29:00Z'))).toBe(60_000);
    expect(msUntilClose(UNTIL, at('2026-11-11T10:31:00Z'))).toBeNull();
    expect(msUntilClose(undefined, at(UNTIL))).toBeNull();
  });
});
