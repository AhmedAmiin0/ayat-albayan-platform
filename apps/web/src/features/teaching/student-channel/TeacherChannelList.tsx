import type { TeacherChannelRow } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

interface Props {
  rows: TeacherChannelRow[];
  selected: string | null;
  onPick: (studentId: string) => void;
}

/** «رسائل الطلاب»: one row per current student, newest activity first, with my unread count. */
export function TeacherChannelList({ rows, selected, onPick }: Props) {
  return (
    <ul className="grid gap-1" aria-label={t.studentChannel.students}>
      {rows.map((r) => (
        <li key={r.student_id}>
          <button
            type="button"
            aria-current={r.student_id === selected || undefined}
            onClick={() => onPick(r.student_id)}
            className={cn('grid min-h-11 w-full gap-0.5 rounded-md px-3 py-2 text-start hover:bg-sunk', r.student_id === selected && 'bg-accent')}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.student_name}</span>
              {r.unread > 0 && (
                <span className="rounded-full bg-primary px-2 text-2xs font-semibold text-primary-foreground tabular-nums">
                  {t.studentChannel.unread.replace('{n}', String(r.unread))}
                </span>
              )}
            </span>
            <span className="truncate text-xs text-ink-3" dir="auto">
              {r.last_message?.body ?? t.studentChannel.noMessageYet}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
