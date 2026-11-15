import type { CallView } from '@ab/shared';
import { windowEnd } from '@ab/client-core';
import { describe, expect, it } from 'vitest';
import { withDays } from './day-groups';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';

// Review correction 2 (docs/37): an anchored window from months ago never shows the chat's later
// calls under its old day chips.

const NOW = new Date(2026, 9, 5, 15, 0);
const at = (month: number, day: number) => new Date(2026, month, day, 10, 0).toISOString();
const call = (id: string, started_at: string): CallView => ({
  id,
  phone_e164: '+966500000009',
  direction: 'inbound',
  status: 'ended',
  end_reason: 'completed',
  display_name: null,
  staff_id: null,
  started_at,
  answered_at: null,
  ended_at: null,
  duration_seconds: 5,
});

describe('withDays inside an anchored window', () => {
  it('leaves out calls after the window newest message', () => {
    const messages = [message({ id: 'a', created_at: at(2, 1) }), message({ id: 'b', created_at: at(2, 3) })];
    const list = [call('in', at(2, 2)), call('later', at(9, 4))];
    const items = withDays(messages, NOW, { list, from: at(2, 1), to: windowEnd(messages) });
    const ids = items.flatMap((i) => (i.kind === 'call' ? [i.call.id] : []));
    expect(ids).toEqual(['in']);
  });

  it('the live chat (no `to`) keeps every later call', () => {
    const messages = [message({ id: 'a', created_at: at(2, 1) })];
    const items = withDays(messages, NOW, { list: [call('later', at(9, 4))], from: null });
    expect(items.some((i) => i.kind === 'call')).toBe(true);
  });
});
