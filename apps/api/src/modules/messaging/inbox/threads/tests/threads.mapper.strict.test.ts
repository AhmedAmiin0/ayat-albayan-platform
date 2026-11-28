import { describe, expect, it } from 'vitest';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { toThreadView } from '@/modules/messaging/inbox/threads/threads.mapper';

const AT = new Date('2026-10-02T08:00:00Z');

const refusal = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : 'thrown';
  }
  return 'answered';
};

describe('toThreadView answers only a chat that fits its schema', () => {
  it('a full v_threads row answers as before', () => {
    expect(toThreadView(threadRow(), AT).phone_e164).toBe('+966501234567');
  });

  it('a row without a phone is refused as response_invalid', () => {
    const row = threadRow({ phone_e164: null });
    expect(refusal(() => toThreadView(row, AT))).toBe('response_invalid');
  });

  it('a row without its last message is refused', () => {
    const row = threadRow({ last_message_id: null, last_message_at: null });
    expect(refusal(() => toThreadView(row, AT))).toBe('response_invalid');
  });

  it('a negative unread count is refused', () => {
    const row = threadRow({ unread_count: -1 });
    expect(refusal(() => toThreadView(row, AT))).toBe('response_invalid');
  });

  it('keys the schema does not name are dropped', () => {
    const row = { ...threadRow(), extra_column: 'x' };
    const view = toThreadView(row, AT);
    expect(Object.keys(view)).not.toContain('extra_column');
  });
});
