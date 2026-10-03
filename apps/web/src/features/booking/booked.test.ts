import type { BookingResult } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { chatPhone, mediaPhone, subscribeTarget } from './booked';
import { emptyDraft } from './draft';

const RESULT: BookingResult = { rule_id: 'r-1', invoice_id: null, student_ids: ['s-new'], guardian_ids: ['g-1'], lessons: [], message_ids: [] };
const LEAD = {
  ...emptyDraft({ leadId: 'lead-1' }),
  newStudent: { name: ' جود ', guardianName: 'أم جود', guardianPhone: '0501234567' },
};

describe('after a booking (R-SUB-01)', () => {
  it('a regular package offers the subscription for the booked student; a trial does not', () => {
    expect(subscribeTarget(LEAD, RESULT)).toEqual({ id: 's-new', name: 'جود', code: null });
    expect(subscribeTarget({ ...LEAD, kind: 'trial', pkg: 'trial' }, RESULT)).toBeNull();
    expect(subscribeTarget(LEAD, { ...RESULT, student_ids: [] })).toBeNull();
  });

  it('a makeup consumes no package, so it never offers the subscription (R-SCH-10)', () => {
    const picked = { id: 's-new', name: 'جود', code: 'AB-0184' };
    expect(subscribeTarget({ ...emptyDraft({ kind: 'makeup' }), students: [picked] }, RESULT)).toBeNull();
  });

  it('an existing student keeps their name and code', () => {
    const picked = { id: 's-1', name: 'سهيلة', code: 'AB-0183' };
    const draft = { ...emptyDraft(), students: [picked, { id: 's-2', name: 'جود', code: 'AB-0184' }] };
    expect(subscribeTarget(draft, { ...RESULT, student_ids: ['s-1', 's-2'] })).toEqual(picked);
  });

  it('the way back to the lead’s chat is their number in E.164', () => {
    expect(chatPhone(LEAD)).toBe('+966501234567');
    expect(chatPhone({ ...LEAD, newStudent: { ...LEAD.newStudent, guardianPhone: '12' } })).toBeNull();
    expect(chatPhone(emptyDraft())).toBeNull();
  });

  it('«من الشات» lists the student’s guardian chat, else the lead’s (R-MSG-06)', () => {
    expect(mediaPhone({ ...emptyDraft(), chatPhone: '+201001234567' })).toBe('+201001234567');
    expect(mediaPhone(LEAD)).toBe('+966501234567');
    expect(mediaPhone(emptyDraft())).toBeNull();
  });
});
