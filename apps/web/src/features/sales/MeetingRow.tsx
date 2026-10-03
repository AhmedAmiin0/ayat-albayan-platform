import { EnterButton } from '@/features/classroom/JoinButton';
import { t } from '@/lib/i18n';
import type { SalesMeeting } from './api';

const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** One meeting: time, who (lead or student), the teacher, and «ادخل الحلقة». */
export function MeetingRow({ meeting: m }: { meeting: SalesMeeting }) {
  return (
    <li className="grid gap-3 border-b border-rule py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-start">
      <span dir="ltr" className="text-lg font-semibold tabular-nums">{CLOCK.format(new Date(m.starts_at))}</span>
      <div className="grid min-w-0 gap-0.5">
        <p className="text-body font-semibold">
          <span className="text-xs font-normal text-ink-3">{t.sales.schedule.lead} </span>
          {m.lead_or_student_name ?? '—'}
        </p>
        <p className="text-xs text-ink-2">
          {t.sales.schedule.teacher} {m.teacher_name}
        </p>
      </div>
      <EnterButton lesson={{ id: m.lesson_id, starts_at: m.starts_at, ends_at: m.ends_at }} />
    </li>
  );
}
