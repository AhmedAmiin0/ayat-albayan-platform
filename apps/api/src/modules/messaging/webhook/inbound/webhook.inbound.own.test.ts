import { describe, expect, it, vi } from 'vitest';
import type { OwnNumbers } from '../../numbers';
import { event, services } from '../webhook.fakes';

// Example numbers only: the academy's chat line and a family.
const OWN = '+966500000009';
const FAMILY = '+966501234567';

/** services() with OwnNumbers answering for OWN only (exact E.164). */
function withOwn() {
  const s = services();
  const own = { has: vi.fn(async (phone: string) => phone === OWN) } as unknown as OwnNumbers;
  Object.assign(s.inbound, { own });
  return s;
}

describe('InboundService — the academy’s own numbers (owner 2026-10-27)', () => {
  it('a template from our notifications number to our chat number: stored, already read, nothing else', async () => {
    const s = withOwn();
    await s.inbound.handle(event({ from: OWN.slice(1), type: 'unsupported', body: null, name: 'أكاديمية آيات البيان' }));
    expect(s.queries.stored).toEqual([
      expect.objectContaining({ direction: 'inbound', phone_e164: OWN, lead_id: null, guardian_id: null, lesson_id: null, read_at: expect.any(String) }),
    ]);
    expect(s.queries.identify).not.toHaveBeenCalled();
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.queries.updateLead).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
  });

  it('a «نعم» from our own number confirms nothing', async () => {
    const s = withOwn();
    await s.inbound.handle(event({ from: OWN.slice(1), body: 'نعم' }));
    expect(s.lessons.confirm).not.toHaveBeenCalled();
    expect(s.queries.recentLessonOutbound).not.toHaveBeenCalled();
  });

  it('a replay of the same wamid stores nothing more and still runs nothing', async () => {
    const s = withOwn();
    const m = event({ from: OWN.slice(1) });
    await s.inbound.handle(m);
    await s.inbound.handle(m);
    expect(s.queries.stored).toHaveLength(1);
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('a family’s message is unchanged: lead, unread row and push', async () => {
    const s = withOwn();
    await s.inbound.handle(event({ from: FAMILY.slice(1) }));
    expect(s.leads.upsertByPhone).toHaveBeenCalled();
    expect(s.queries.stored[0]).toMatchObject({ phone_e164: FAMILY });
    expect(s.queries.stored[0]).not.toHaveProperty('read_at');
    expect(s.push.notifyAdmins).toHaveBeenCalledWith('new_lead', expect.anything());
  });

  it('a number one digit away from ours is a family (exact match only)', async () => {
    const s = withOwn();
    await s.inbound.handle(event({ from: '966500000008' }));
    expect(s.leads.upsertByPhone).toHaveBeenCalled();
  });
});
