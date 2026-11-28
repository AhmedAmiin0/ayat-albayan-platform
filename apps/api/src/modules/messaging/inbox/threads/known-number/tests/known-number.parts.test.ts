import { describe, expect, it } from 'vitest';
import { knownOf } from '@/modules/messaging/inbox/threads/known-number';

const GUARDIAN = { id: 'g1', name: 'ولي الأمر', tz: 'Asia/Riyadh' };

describe('knownOf (what the phone reads found)', () => {
  it('nothing found is nobody (null)', () => {
    expect(knownOf({ guardian: null, lead: undefined, teacher: undefined })).toBeNull();
  });

  it('a guardian alone: its fields, no lead or teacher', () => {
    expect(knownOf({ guardian: GUARDIAN, lead: undefined, teacher: undefined })).toEqual({
      guardian_id: 'g1',
      guardian_name: 'ولي الأمر',
      guardian_tz: 'Asia/Riyadh',
      lead_id: null,
      lead_status: null,
      teacher_id: null,
    });
  });

  it('a lead and a teacher without a guardian', () => {
    const lead = { id: 'l1', status: 'new' as const };
    expect(knownOf({ guardian: null, lead, teacher: { id: 't1' } })).toEqual({
      guardian_id: null,
      guardian_name: null,
      guardian_tz: null,
      lead_id: 'l1',
      lead_status: 'new',
      teacher_id: 't1',
    });
  });
});
