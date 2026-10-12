import { kindOfStatusParam, STUDENT_STATUSES, statusParamOfKind, type StudentListKind } from '@ab/shared';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { t } from '@/lib/i18n';
import type { StatusCounts } from './api';

const L = t.studentLists;

export interface StudentKindSwitchProps {
  /** The list's `status` URL filter as it is («active», «trial,active» …). */
  status: string | undefined;
  /** Students per status under the other filters; no counts while loading. */
  counts?: StatusCounts | undefined;
  /** The new `status` filter ('' = every status). */
  onChange: (status: string) => void;
}

/** A real count, or none (loading, or an answer of another shape). */
const num = (n: unknown): number | undefined => (typeof n === 'number' ? n : undefined);

function kindCounts(counts: StatusCounts | undefined): Record<StudentListKind, number | undefined> {
  const each = STUDENT_STATUSES.map((s) => num(counts?.[s]));
  const all = each.every((n) => n !== undefined) ? each.reduce<number>((sum, n) => sum + (n ?? 0), 0) : undefined;
  return { all, active: num(counts?.active), trial: num(counts?.trial) };
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
