import type { SalesTeacherView } from '@ab/shared';
import { Avatar } from '@/components/ui/display/avatar';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { cn } from '@/lib/utils';
import { programList } from './teacher-view';

export interface TeacherListItemProps {
  teacher: SalesTeacherView;
  selected: boolean;
  onSelect: (id: string) => void;
}

/**
 * One teacher in «المعلمون»: photo (or initials), name, «معلمة · القرآن الكريم», «مشترك n · تجريبي n» (owner 2026-10-12)
 * and today's lessons as counts, and «في حلقة الآن» (green chip: information, not the salesperson's
 * job, so never saffron). The whole row opens the teacher's students (≥ 44px tall).
 */
export function TeacherListItem({ teacher, selected, onSelect }: TeacherListItemProps) {
  const name = teacherLabel({ display_name_ar: teacher.name, display_name_en: teacher.name_en });
  return (
    <li className="border-b border-rule">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-current={selected || undefined}
        onClick={() => onSelect(teacher.id)}
        className={cn(
          'flex min-h-11 w-full items-start gap-3 px-2 py-3 text-start transition-colors duration-[120ms] hover:bg-sunk focus-visible:outline-2 focus-visible:outline-ring',
          selected && 'bg-sunk',
        )}
      >
        <Avatar name={name} id={teacher.id} src={teacher.avatar_url} size="sm" decorative />
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-ink">{name}</span>
            {teacher.live_now && <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} />}
          </span>
          <span className="text-xs text-ink-3">{`${t.teachers.genderLabel[teacher.gender]} · ${programList(teacher)}`}</span>
          <span className="flex flex-wrap gap-x-4 text-xs text-ink-2 tabular-nums">
            <span>
              {t.studentLists.counts.replace('{active}', String(teacher.active_count)).replace('{trial}', String(teacher.trial_count))}
            </span>
            <span>{t.sales.teachers.lessonsToday.replace('{n}', String(teacher.lessons_today))}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
