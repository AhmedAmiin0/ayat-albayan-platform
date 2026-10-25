import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { monthLabel } from '@/teacher/payout-text';
import { lengthOf, type EditState } from './edit-time-body';
import { failureCode } from './edit-time-errors';
import type { EditableLesson } from './types';

/** 409 `payout_locked {month, status}`: the teacher's payout for that month is approved or paid. */
export interface PayoutLock {
  month: string | null;
  status: string | null;
}

const statuses: Record<string, string | undefined> = t.enums.payoutStatus;

/** The lock a failed PATCH reports, else null. An older API sends no month: the general line then. */
export function payoutLockOf(error: unknown): PayoutLock | null {
  if (failureCode(error) !== 'payout_locked') return null;
  const body = error instanceof ApiError ? (error.body as { month?: unknown; status?: unknown }) : {};
  return {
    month: typeof body.month === 'string' ? body.month : null,
    status: typeof body.status === 'string' ? body.status : null,
  };
}

/** «مستحقات المعلم/ة لشهر سبتمبر 2026 اتعتمدت، فمينفعش تغيّر مدة الحلقة دي». */
export function lockedText(lock: PayoutLock): string {
  const status = lock.status ? statuses[lock.status] : undefined;
  if (!lock.month || !status) return t.editTime.error.payout_locked;
  return t.editTime.lockedMonth.replace('{month}', monthLabel(lock.month)).replace('{status}', status);
}

/**
 * The payout is locked and the picked length is not the recorded one: saving would be refused
 * again. A start-only correction (the recorded length) still goes through.
 */
export const lengthLocked = (lock: PayoutLock | null, lesson: EditableLesson, s: EditState): boolean =>
  lock !== null && s.durationMin !== lengthOf(lesson);
