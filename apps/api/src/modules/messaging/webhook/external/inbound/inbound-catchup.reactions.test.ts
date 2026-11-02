import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { catchUpRig, GAP_AT, GAP_TS, kapsoInbound, NOW, page } from './inbound.fakes';

// A reaction is never a row, so `existing` never holds it: without this rule every run would
// UPDATE (and broadcast) the same emoji again.

const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no kapso chat number');
  return n;
};
const reaction = { message_id: 'wamid.OUT9', emoji: '👍' };
const react = kapsoInbound({ id: 'wamid.R', type: 'reaction', text: undefined, reaction });

function rig(newest: Date) {
  const x = catchUpRig();
  const apply = vi.fn().mockResolvedValue(undefined);
  Object.assign(x.inbound, { reactions: { apply } });
  x.repo.newestInbound.mockResolvedValue(newest);
  x.kapso.inbound.mockResolvedValue(page([react]));
  return { x, apply };
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('InboundCatchUp — reactions already applied', () => {
  it('up to the newest held row: skipped (no UPDATE, no broadcast)', async () => {
    const { x, apply } = rig(new Date(GAP_AT.getTime() + 60_000));
    expect(await x.catchUp.number(chat(), { now: NOW, full: false })).toMatchObject({ skipped: 1 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('newer than the newest held row: applied', async () => {
    const { x, apply } = rig(new Date(Number(GAP_TS) * 1000 - 60_000));
    await x.catchUp.number(chat(), { now: NOW, full: false });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('a full (week) read applies it: one sent during a gap is held nowhere', async () => {
    const { x, apply } = rig(new Date(GAP_AT.getTime() + 60_000));
    await x.catchUp.number(chat(), { now: NOW, full: true });
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
