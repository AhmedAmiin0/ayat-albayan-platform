import { describe, expect, it } from 'vitest';
import { portalHomeSchema } from './portal';

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
