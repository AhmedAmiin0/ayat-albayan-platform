import type { Conflict } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import type { ChangeTarget } from './change-body';

interface OverrideInput {
  target: ChangeTarget | undefined;
  check: { isSuccess: boolean; data: { conflicts: Conflict[] } | undefined };
}

/**
 * The review's save gate: blocked until the check answers clean. With the target's override
 * (the admin, owner 2026-10-30, R-SCH-04) a clash may be saved with «سبب تجاوز التعارض».
 */
export function useOverride({ target, check }: OverrideInput): {
  field: ReactNode;
  reason: string | undefined;
  blocked: boolean;
} {
  const [value, setValue] = useState('');
  const clashes = (check.data?.conflicts.length ?? 0) > 0;
  const none = { field: null, reason: undefined, blocked: !check.isSuccess };
  if (!check.isSuccess || !clashes) return none;
  const allowed = target?.override === true;
  const reason = allowed && value.trim() !== '' ? value.trim() : undefined;
  const label = t.courseActions.overrideReason;
  const field = allowed ? <Field label={label} value={value} onChangeText={setValue} /> : null;
  return { field, reason, blocked: reason === undefined };
}
