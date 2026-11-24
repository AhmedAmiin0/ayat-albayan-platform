import type { BookingKind } from '@/booking/shared/contract';

export type Step = 'contact' | 'teacher' | 'package' | 'slot' | 'invoice' | 'confirm';

/** A trial has no package or invoice; a makeup is one lesson of a known student, with proof. */
export function stepsFor(kind: BookingKind): readonly Step[] {
  if (kind === 'trial') return ['contact', 'teacher', 'slot', 'confirm'];
  if (kind === 'package') return ['contact', 'teacher', 'package', 'slot', 'invoice', 'confirm'];
  return ['teacher', 'slot', 'invoice', 'confirm'];
}
