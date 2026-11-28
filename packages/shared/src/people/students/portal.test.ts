import { describe, expect, it } from 'vitest';
import { portalHomeSchema } from './portal';
import {
  PORTAL_HISTORY_STATUSES,
  PORTAL_OUTCOMES,
  portalHistoryStatusSchema,
  portalOutcomeSchema,
} from './portal-family';

const base = { kind: 'guardian', students: [], renew_url: null };

describe('portalHomeSchema guardian', () => {
  it("carries a guardian login's own name and E.164 number", () => {
    const guardian = { name: 'أحمد', phone: '+201001234567' };
    expect(portalHomeSchema.parse({ ...base, guardian }).guardian).toEqual(guardian);
  });

  it('is null for a student login and absent from an older API', () => {
    const student = portalHomeSchema.parse({ ...base, kind: 'student', guardian: null });
    expect(student.guardian).toBeNull();
    expect(portalHomeSchema.parse(base).guardian).toBeUndefined();
  });

  it('rejects a guardian without a number', () => {
    const res = portalHomeSchema.safeParse({ ...base, guardian: { name: 'أحمد' } });
    expect(res.success).toBe(false);
  });
});

describe('portalStudentSchema is_test (docs/56)', () => {
  const kid = {
    id: 's1',
    code: 'AB-0001',
    name: 'سارة',
    tz: 'Asia/Riyadh',
    contact_is_self: false,
  };

  it("keeps the student's test flag, and leaves it out on an older API", () => {
    const home = (students: unknown[]) => portalHomeSchema.parse({ ...base, students }).students;
    expect(home([{ ...kid, is_test: true }])[0]?.is_test).toBe(true);
    expect(home([kid])[0]?.is_test).toBeUndefined();
  });
});

describe('portal history enums', () => {
  it('accept each outcome and list and nothing else', () => {
    expect(portalOutcomeSchema.options).toEqual([...PORTAL_OUTCOMES]);
    expect(portalHistoryStatusSchema.options).toEqual([...PORTAL_HISTORY_STATUSES]);
    expect(portalHistoryStatusSchema.validate('excused')).toBe(false);
  });
});
