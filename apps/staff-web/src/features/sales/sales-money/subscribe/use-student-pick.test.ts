import type { SalesFamilyStudent } from '@ab/shared';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { INITIAL_PRICING, type PricingForm } from '@/features/finance/subscriptions';
import { student } from '@/features/sales/sales-money/sales-money-fixture';
import { useStudentPick } from './use-student-pick';

const SEED: PricingForm = { ...INITIAL_PRICING, discount: 10 };
const OTHER: PricingForm = { ...INITIAL_PRICING, discount: 20 };
const due = (id: string, renewal: PricingForm): SalesFamilyStudent =>
  student({ id, renew_due: true, renewal });

describe('useStudentPick', () => {
  it('picks the only student and starts from the default calculator', () => {
    const { result } = renderHook(() =>
      useStudentPick({ students: [student({ id: 's1' })], renew: false }),
    );
    expect(result.current.studentId).toBe('s1');
    expect(result.current.form).toEqual(INITIAL_PRICING);
  });

  it('picks nobody among several students until one is chosen', () => {
    const students = [student({ id: 's1' }), student({ id: 's2' })];
    const { result } = renderHook(() => useStudentPick({ students, renew: false }));
    expect(result.current.studentId).toBe('');
    act(() => {
      result.current.pick('s2');
    });
    expect(result.current.studentId).toBe('s2');
    expect(result.current.form).toEqual(INITIAL_PRICING);
  });

  it('keeps the edited calculator when a new subscription changes student', () => {
    const students = [student({ id: 's1' }), student({ id: 's2' })];
    const { result } = renderHook(() => useStudentPick({ students, picked: 's1', renew: false }));
    act(() => {
      result.current.setForm(SEED);
    });
    act(() => {
      result.current.pick('s2');
    });
    expect(result.current.form).toEqual(SEED);
  });

  it('a renewal lists only the students due (and the picked one), seeded from the last package', () => {
    const students = [due('s1', SEED), student({ id: 's2', renew_due: false }), due('s3', OTHER)];
    const { result } = renderHook(() => useStudentPick({ students, picked: 's1', renew: true }));
    expect(result.current.choices.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(result.current.form).toEqual(SEED);
    act(() => {
      result.current.pick('s3');
    });
    expect(result.current.form).toEqual(OTHER);
  });
});
