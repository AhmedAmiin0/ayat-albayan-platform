import { describe, expect, it } from 'vitest';
import { IDS, leadRequest } from '../booking.fakes';
import { withLeadFacts, type LeadFacts } from './booking.lead-merge';

const lead = (over: Partial<LeadFacts> = {}): LeadFacts => ({
  id: IDS.lead,
  status: 'qualified',
  source: 'facebook_ad',
  qualification: { level: 'مبتدئ', memorized: 'جزء عم', goal: 'الحفظ', riwaya: 'حفص', notes: 'بتحب القصص', city: 'جدة' },
  ...over,
});
const req = (newStudent: Record<string, unknown> = {}, guardian: Record<string, unknown> = {}) => {
  const base = leadRequest();
  if (!('newStudent' in base)) throw new Error('lead path expected');
  return { ...base, newStudent: { ...base.newStudent, ...newStudent }, guardian: { ...base.guardian, ...guardian } };
};

describe('withLeadFacts (lead → student, mobile and web alike)', () => {
  it('fills level, memorized, goal, riwaya, notes and the guardian source from the lead', () => {
    const out = withLeadFacts(req({ level: undefined, source: undefined }, { source: null }), lead());
    expect(out.newStudent).toMatchObject({ level: 'مبتدئ', memorized: 'جزء عم', goal: 'الحفظ', riwaya: 'حفص', notes: 'بتحب القصص' });
    expect(out.guardian.source).toBe('facebook_ad');
  });

  it('what the client sent wins, blanks do not', () => {
    const out = withLeadFacts(req({ level: 'متوسط', goal: '  ' }, { source: 'whatsapp_direct' }), lead());
    expect(out.newStudent).toMatchObject({ level: 'متوسط', goal: 'الحفظ' });
    expect(out.guardian.source).toBe('whatsapp_direct');
  });

  it('no lead, or an unreadable qualification, changes nothing', () => {
    const input = req({ level: undefined });
    expect(withLeadFacts(input, null).newStudent).toEqual(input.newStudent);
    expect(withLeadFacts(input, lead({ qualification: 'x' })).newStudent.level).toBeUndefined();
  });
});
