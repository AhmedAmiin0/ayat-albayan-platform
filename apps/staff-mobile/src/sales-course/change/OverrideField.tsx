import type { Conflict } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { t, Field } from '@ab/mobile-kit';
import type { ChangeTarget } from './change-body';

interface OverrideInput {
  target: ChangeTarget | undefined;
  check: { isSuccess: boolean; data: { conflicts: Conflict[] } | undefined };
}

/** Blocked until a clean check; only the admin may override a clash with a reason (R-SCH-04). */
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
