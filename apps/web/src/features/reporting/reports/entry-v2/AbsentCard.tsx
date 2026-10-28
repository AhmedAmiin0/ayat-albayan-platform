import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n/i18n';
import { ReportTextField } from '../entry/ReportTextField';
import { CARD, CARD_TITLE } from './v2-classes';

export interface AbsentCardProps {
  attendance: 'absent' | 'excused';
  notes: string;
  onNotes: (notes: string) => void;
}

/**
 * Absent or excused: no content and no grades. The family gets one line; an absence without
 * notice counts against the package, an excuse in advance does not.
 */
export function AbsentCard({ attendance, notes, onNotes }: AbsentCardProps) {
  const v2 = t.reports.v2;
  const absent = attendance === 'absent';
  const title = absent ? v2.attendance.absent : v2.excusedTitle;
  return (
    <section aria-label={title} className={CARD}>
      <h3 className={CARD_TITLE}>{title}</h3>
      <p className="text-sm text-ink-2">{v2.absentHint}</p>
      <span className={cn('justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold', absent ? 'bg-act-soft text-act' : 'bg-ok-soft text-ok')}>
        {absent ? v2.charged : v2.notCharged}
      </span>
      <ReportTextField label={v2.absentNote} value={notes} onChange={onNotes} placeholder={v2.absentNotePlaceholder} />
    </section>
  );
}
