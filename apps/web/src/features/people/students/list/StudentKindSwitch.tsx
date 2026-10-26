import { kindOfStatusParam, NOT_SUBSCRIBED_STATUSES, STUDENT_STATUSES, statusParamOfKind, type StudentListKind, type StudentStatus } from '@ab/shared';
import { SegmentedControl } from '@/components/ui/form/segmented-control';
import { t } from '@/lib/i18n/i18n';
import type { StatusCounts } from '../api';

const L = t.studentLists;

export interface StudentKindSwitchProps {
  /** The list's `status` URL filter as it is («active», «new,trial,pending_subscription» …). */
  status: string | undefined;
  /** Students per status under the other filters; no counts while loading. */
  counts?: StatusCounts | undefined;
  /** The new `status` filter ('' = every status). */
  onChange: (status: string) => void;
}

/** A real count, or none (loading, or an answer of another shape). */
const num = (n: unknown): number | undefined => (typeof n === 'number' ? n : undefined);

/** The sum of these statuses' counts, or none while any is missing. */
function sumOf(counts: StatusCounts | undefined, statuses: readonly StudentStatus[]): number | undefined {
  const each = statuses.map((s) => num(counts?.[s]));
  return each.every((n) => n !== undefined) ? each.reduce<number>((sum, n) => sum + (n ?? 0), 0) : undefined;
}

/** «تجريبي» = not subscribed yet (new + trial + pending_subscription, owner 2026-10-15). */
function kindCounts(counts: StatusCounts | undefined): Record<StudentListKind, number | undefined> {
  return { all: sumOf(counts, STUDENT_STATUSES), active: num(counts?.active), trial: sumOf(counts, NOT_SUBSCRIBED_STATUSES) };
}

/**
 * «الكل · مشترك · تجريبي» above the students list (owner 2026-10-12), outside «تصفية»: the same
 * `status` filter as the status chips. Another combination of statuses presses no segment.
 */
export function StudentKindSwitch({ status, counts, onChange }: StudentKindSwitchProps) {
  const n = kindCounts(counts);
  const options = (['all', 'active', 'trial'] as const).map((kind) => ({ value: kind, label: L[kind], count: n[kind] }));
  return (
    <SegmentedControl
      label={L.kinds}
      options={options}
      value={kindOfStatusParam(status)}
      onChange={(kind) => onChange(statusParamOfKind(kind) ?? '')}
    />
  );
}
