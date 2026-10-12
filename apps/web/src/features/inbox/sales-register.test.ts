import { describe, expect, it } from 'vitest';
import { thread } from './inbox-fixture';
import { canRegisterFrom, draftFromThread } from './sales-register';

describe('sales chat registration: which threads and the prefill', () => {
  it('a lead in the funnel only: not a guardian, a teacher, a converted or a lost lead', () => {
    expect(canRegisterFrom(thread())).toBe(true);
    expect(canRegisterFrom(thread({ lead_status: 'trial_booked' }))).toBe(true);
    expect(canRegisterFrom(thread({ guardian_id: 'g-1' }))).toBe(false);
    expect(canRegisterFrom(thread({ teacher_id: 't-1' }))).toBe(false);
    expect(canRegisterFrom(thread({ lead_status: 'converted' }))).toBe(false);
    expect(canRegisterFrom(thread({ lead_status: 'lost' }))).toBe(false);
    expect(canRegisterFrom(thread({ lead_id: null }))).toBe(false);
  });

  it('the lead, the number, the WhatsApp name and the source fill step 1 of a trial', () => {
    const d = draftFromThread({ ...thread(), lead_id: 'lead-1' });
    expect([d.leadId, d.kind, d.chatPhone]).toEqual(['lead-1', 'trial', '+966501234567']);
    expect(d.newStudent).toMatchObject({ name: '', guardianName: 'أم سهيلة', guardianPhone: '+966501234567', source: 'facebook_ad' });
  });

  it('falls back to the display name, and keeps no source when the lead has none', () => {
    const d = draftFromThread({ ...thread({ lead_name: null, display_name: 'أبو عمر', lead_source: null }), lead_id: 'lead-1' });
    expect(d.newStudent).toMatchObject({ guardianName: 'أبو عمر', source: '' });
  });
});
