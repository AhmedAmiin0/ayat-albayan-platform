import type { BookingKind } from '../../shared/contract';

export type Step = 'contact' | 'teacher' | 'package' | 'slot' | 'invoice' | 'confirm';

/**
 * A wizard's steps in order, by booking type: a trial has no package and no invoice (free); a
 * package asks the size, then the payment proof («الفاتورة») before the review; a makeup is
 * one lesson of a known student (no contact, no package) and also needs the proof.
 */
export function stepsFor(kind: BookingKind): readonly Step[] {
  if (kind === 'trial') return ['contact', 'teacher', 'slot', 'confirm'];
  if (kind === 'package') return ['contact', 'teacher', 'package', 'slot', 'invoice', 'confirm'];
  return ['teacher', 'slot', 'invoice', 'confirm'];
}
