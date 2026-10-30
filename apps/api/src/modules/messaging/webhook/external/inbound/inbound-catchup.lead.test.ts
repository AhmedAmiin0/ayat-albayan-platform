import { nextFollowUpAt } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/integrations/numbers-overlay';
import { kapsoOverlay } from '@/modules/messaging/webhook/external/external.fakes';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { lead } from '@/modules/sales/leads/leads.fakes';
import type { InboundContact } from '@/modules/sales/leads/leads.service';
import { event } from '@/modules/messaging/webhook/webhook.fakes';
import { catchUpRig, FAMILY_WA, kapsoInbound, NOW, page } from './inbound.fakes';

// Finding 3 of PR #452: a back-filled message must not make a lead's follow-up due at once.

const RUN = { now: NOW, full: false };
const HOURS = [24, 72];
const TWO_DAYS_AGO = new Date(NOW.getTime() - 2 * 86_400_000);
const ts = (at: Date) => String(at.getTime() / 1000);
const chat = () => {
  const [n] = kapsoChatNumbers();
  if (!n) throw new Error('no kapso chat number');
  return n;
};

/** The upsert as LeadsService does it: last_inbound_at = the contact's `at` (the cycle start). */
function leadAfterUpsert(x: ReturnType<typeof catchUpRig>, stage = 2) {
  x.queries.identify.mockResolvedValue({ guardian: null, teacher: null, lead: { id: 'l1', name: null, follow_up_stage: stage } });
  x.leads.upsertByPhone.mockImplementation(async (c: InboundContact) =>
    lead({ id: 'l1', status: 'no_reply', follow_up_stage: stage, last_inbound_at: c.at?.toISOString() ?? null }));
}

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.useRealTimers();
});

describe('InboundCatchUp — lead follow-ups after a back-fill (owner 2026-10-30)', () => {
  it('a 2-day-old message: the cycle starts at the back-fill, the next follow-up is 24 h later', async () => {
    const x = catchUpRig();
    leadAfterUpsert(x);
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ timestamp: ts(TWO_DAYS_AGO) })]));
    await x.catchUp.number(chat(), RUN);
    const row = await x.leads.upsertByPhone.mock.results[0]?.value;
    expect(x.leads.upsertByPhone).toHaveBeenCalledWith(expect.objectContaining({ at: NOW }));
    expect(x.queries.updateLead).toHaveBeenCalledWith('l1', { follow_up_stage: 0 });
    const due = nextFollowUpAt({ ...row, follow_up_stage: 0 }, HOURS);
    expect(due).toEqual(new Date(NOW.getTime() + 24 * 3_600_000));
    // The bug: the old time made the follow-up due a day before the back-fill.
    const old = nextFollowUpAt({ ...row, follow_up_stage: 0, last_inbound_at: TWO_DAYS_AGO.toISOString() }, HOURS);
    expect(old && old < NOW).toBe(true);
    expect(x.queries.stored[0]?.created_at).toBe(TWO_DAYS_AGO.toISOString()); // the row keeps its time
  });

  it('a fresh one (5 min, not quiet) keeps the message time, as the webhook', async () => {
    const x = catchUpRig();
    leadAfterUpsert(x, 0);
    const fresh = new Date(NOW.getTime() - 300_000);
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ timestamp: ts(fresh) })]));
    await x.catchUp.number(chat(), RUN);
    expect(x.leads.upsertByPhone).toHaveBeenCalledWith(expect.objectContaining({ at: fresh }));
  });

  it('quiet without a run time: the clock', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const x = catchUpRig();
    await x.inbound.handle(event({ at: TWO_DAYS_AGO }), { quiet: true });
    expect(x.leads.upsertByPhone).toHaveBeenCalledWith(expect.objectContaining({ at: NOW }));
  });

  it('a new lead gets the family\'s WhatsApp name (kapso.contact_name)', async () => {
    const x = catchUpRig();
    const kapso = { direction: 'inbound', phone_number: `+${FAMILY_WA}`, contact_name: 'أم سارة' };
    x.kapso.inbound.mockResolvedValue(page([kapsoInbound({ kapso })]));
    await x.catchUp.number(chat(), RUN);
    expect(x.leads.upsertByPhone).toHaveBeenCalledWith(expect.objectContaining({ name: 'أم سارة' }));
  });
});
