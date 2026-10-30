import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/integrations/numbers-overlay';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { catchUpRig, kapsoInbound, NOW, page } from './inbound.fakes';

// A family's edit, revoke or reaction read from Kapso's inbound history goes through the webhook's
// own path (InboundService.handle): a hidden marker row (migration 985), never a bubble, an
// unread or a push; a reaction whose message we do not hold yet waits as a marker too.

const RUN = { now: NOW, full: false };
const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no Kapso chat number');
  return n;
};
const ORIGINAL = 'wamid.FAMILY7';

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('inbound catch-up: markers', () => {
  it('an edit and a revoke are read marker rows; no push, never counted as late messages', async () => {
    const x = catchUpRig();
    const edit = { original_message_id: ORIGINAL, message: { text: { body: 'غدًا' } } };
    x.kapso.inbound.mockResolvedValue(
      page([
        kapsoInbound({ id: 'wamid.E7', type: 'edit', text: undefined, edit }),
        kapsoInbound({
          id: 'wamid.V7',
          type: 'revoke',
          text: undefined,
          revoke: { original_message_id: ORIGINAL },
        }),
      ]),
    );
    await x.catchUp.number(chat(), RUN);
    const rows = x.queries.stored.map((r) => [r.wa_message_id, r.body, r.interactive_payload]);
    expect(rows).toEqual([
      ['wamid.E7', null, { type: 'edit', marker: true, target: ORIGINAL, text: 'غدًا' }],
      ['wamid.V7', null, { type: 'revoke', marker: true, target: ORIGINAL }],
    ]);
    expect(x.queries.stored.every((r) => r.read_at)).toBe(true);
    expect(x.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a reaction on a message we do not hold yet waits as a marker', async () => {
    const x = catchUpRig();
    Object.assign(x.inbound, { reactions: { apply: vi.fn().mockResolvedValue('unknown') } });
    const reaction = { message_id: 'wamid.OUT-LATER', emoji: '🤍' };
    x.kapso.inbound.mockResolvedValue(
      page([kapsoInbound({ id: 'wamid.R7', type: 'reaction', text: undefined, reaction })]),
    );
    await x.catchUp.number(chat(), RUN);
    expect(x.queries.stored).toEqual([
      expect.objectContaining({
        wa_message_id: 'wamid.R7',
        interactive_payload: expect.objectContaining({ target: 'wamid.OUT-LATER' }),
      }),
    ]);
  });
});
