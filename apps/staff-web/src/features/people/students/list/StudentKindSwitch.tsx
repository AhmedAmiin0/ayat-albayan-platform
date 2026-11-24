import {
  kindOfStatusParam,
  NOT_SUBSCRIBED_STATUSES,
  statusParamOfKind,
  type StudentListKind,
} from '@ab/shared';
import { STUDENT_STATUSES, type StudentStatus } from '@ab/catalog';
import { SegmentedControl } from '@ab/web-kit/components/ui/form/segmented-control';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { StatusCounts } from '@/features/people/students/api';

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

/** Trial means not subscribed yet: new, trial and pending_subscription. */
function kindCounts(counts: StatusCounts | undefined): Record<StudentListKind, number | undefined> {
  return { all: sumOf(counts, STUDENT_STATUSES), active: num(counts?.active), trial: sumOf(counts, NOT_SUBSCRIBED_STATUSES) };
}

/** Uses the same `status` filter as the chips; other status combinations press no segment. */
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
