import { QUICK_NOTES, type QuickNote, type ReportView } from '@ab/shared';
import { useId } from 'react';
import { controlClass } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { AttachmentsField } from '@/features/reporting/reports/entry/AttachmentsField';
import type { ReportEntryV2State } from '@/features/reporting/reports/entry-v2/use-report-entry-v2';
import { ToggleChips } from '@/features/reporting/reports/entry-v2/ToggleChips';
import { CARD, CARD_TITLE, OPTIONAL } from '@/features/reporting/reports/entry-v2/v2-classes';

export interface NoteCardProps {
  s: ReportEntryV2State;
  report: ReportView;
}

const toggled = (list: readonly QuickNote[], q: QuickNote) => (list.includes(q) ? list.filter((x) => x !== q) : [...list, q]);

/** «ملاحظة للأسرة (اختياري)»: quick notes, the teacher's words, then the attachments. */
export function NoteCard({ s, report }: NoteCardProps) {
  const v2 = t.reports.v2;
  const id = useId();
  const options = QUICK_NOTES.map((q) => ({ value: q, label: v2.quick[q] }));
  return (
    <section aria-label={v2.note} className={CARD}>
      <label htmlFor={id} className={CARD_TITLE}>
        {v2.note} <span className={OPTIONAL}>{v2.optional}</span>
      </label>
      <ToggleChips
        label={v2.note}
        options={options}
        selected={s.values.content.quick}
        onToggle={(q) => s.setContent((c) => ({ ...c, quick: toggled(c.quick, q) }))}
      />
      <textarea
        id={id}
        rows={2}
        maxLength={4000}
        value={s.values.notes}
        placeholder={v2.notePlaceholder}
        onChange={(e) => s.set('notes', e.target.value)}
        className={cn(controlClass, 'field-sizing-content min-h-20 py-2 leading-relaxed')}
      />
      <AttachmentsField reportId={report.id} files={report.attachments} onChange={s.setAttachments} editable={report.can_edit} addLabel={t.reports.v2.attach} />
    </section>
  );
}
