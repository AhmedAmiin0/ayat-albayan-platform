import type { SalesFamilyStudent } from '@ab/shared';
import { useState } from 'react';
import { INITIAL_PRICING, type PricingForm } from '@/features/finance/subscriptions';
import type { StudentPickInput } from './SalesSubscribeStep.types';

const onlyId = (choices: readonly SalesFamilyStudent[]): string =>
  choices.length === 1 ? (choices[0]?.id ?? '') : '';

/** The student the package is for; a renewal reseeds the calculator from the student's last. */
export function useStudentPick({ students, picked, renew }: StudentPickInput) {
  const choices = renew ? students.filter((s) => s.renew_due || s.id === picked) : students;
  const seedOf = (id: string): PricingForm =>
    (renew ? students.find((s) => s.id === id)?.renewal : undefined) ?? INITIAL_PRICING;
  const [studentId, setStudentId] = useState(() => picked ?? onlyId(choices));
  const [form, setForm] = useState<PricingForm>(() => seedOf(studentId));
  const pick = (id: string) => {
    setStudentId(id);
    setForm((f) => (renew ? seedOf(id) : f));
  };
  return { choices, studentId, form, setForm, pick };
}
