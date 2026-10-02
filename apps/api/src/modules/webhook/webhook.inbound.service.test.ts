import { describe, expect, it } from 'vitest';
import { lead } from '../leads/leads.fakes';
import { AT, event, GUARDIAN_ID, NEW_LEAD_ID, nobody, services } from './webhook.fakes';

const PHONE = '+966501234567';
const LEAD_ID = '00000000-0000-4000-8000-0000000000c2';

describe('InboundService — who is writing', () => {
  it('first message from an unknown number: creates the lead, stores the row, pushes new_lead', async () => {
    const s = services();
    await s.inbound.handle(event());
    expect(s.leads.upsertByPhone).toHaveBeenCalledWith({ phone: PHONE, name: 'أم سهيلة', at: AT });
    expect(s.queries.stored).toEqual([
      expect.objectContaining({ direction: 'inbound', phone_e164: PHONE, lead_id: NEW_LEAD_ID, guardian_id: null }),
    ]);
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_lead', expect.objectContaining({ subject: NEW_LEAD_ID }));
  });

  it('a known lead: touches it, resets its follow-up stage, pushes new_message', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue({ ...nobody(), lead: { id: LEAD_ID, name: 'سارة', follow_up_stage: 2 } });
    s.leads.upsertByPhone.mockResolvedValue(lead({ id: LEAD_ID, follow_up_stage: 2 }));
    await s.inbound.handle(event());
    expect(s.queries.updateLead).toHaveBeenCalledWith(LEAD_ID, { follow_up_stage: 0 });
    expect(s.queries.stored[0]?.lead_id).toBe(LEAD_ID);
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_message', expect.objectContaining({ vars: expect.objectContaining({ name: 'سارة' }) }));
  });

  it('a guardian: no lead is created, the row is linked to the guardian', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
    await s.inbound.handle(event());
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.queries.stored[0]).toMatchObject({ guardian_id: GUARDIAN_ID, lead_id: null });
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_message', expect.anything());
  });

  it('a teacher: no lead is created', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue({ ...nobody(), teacher: { id: 't1', name: 'أ. منى' } });
    await s.inbound.handle(event());
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.queries.stored).toHaveLength(1);
  });

  it('a job applicant: upsertByPhone skips it, the message is still stored', async () => {
    const s = services();
    s.leads.upsertByPhone.mockResolvedValue(null);
    await s.inbound.handle(event());
    expect(s.queries.stored[0]?.lead_id).toBeNull();
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_message', expect.anything());
  });

  it('a wa_id that is not a phone is skipped', async () => {
    const s = services();
    await s.inbound.handle(event({ from: 'abc' }));
    expect(s.queries.identify).not.toHaveBeenCalled();
    expect(s.queries.stored).toEqual([]);
  });

  it.each([
    ['966501234567', '+966501234567'],
    ['201001234567', '+201001234567'],
    ['971501234567', '+971501234567'],
  ])('wa_id %s is stored as %s', async (from, e164) => {
    const s = services();
    await s.inbound.handle(event({ from }));
    expect(s.queries.identify).toHaveBeenCalledWith(e164);
    expect(s.queries.stored[0]?.phone_e164).toBe(e164);
  });
});

describe('InboundService — replays', () => {
  it('a wamid Meta re-sends is stored once and pushes once', async () => {
    const s = services();
    await s.inbound.handle(event());
    await s.inbound.handle(event());
    expect(s.queries.stored).toHaveLength(1);
    expect(s.push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('a replayed «نعم» confirms once', async () => {
    const s = services();
    s.queries.identify.mockResolvedValue({ ...nobody(), guardian: { id: GUARDIAN_ID, name: 'أم سهيلة' } });
    s.queries.nextScheduledLesson.mockResolvedValue('00000000-0000-4000-8000-0000000000a1');
    await s.inbound.handle(event({ body: 'نعم' }));
    await s.inbound.handle(event({ body: 'نعم' }));
    expect(s.lessons.confirm).toHaveBeenCalledTimes(1);
  });
});
