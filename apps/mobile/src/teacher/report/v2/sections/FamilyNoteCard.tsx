import { QUICK_NOTES } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { AttachmentsField } from '../../components/AttachmentsField';
import { ReportTextField } from '../../components/ReportTextField';
import { toggleQuick } from '../hooks/content-edit';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Card } from '../ui/Card';
import { Pills } from '../ui/Pills';

/** «ملاحظة للأسرة (اختياري)»: quick-note chips (any number), the note itself, and attachments. */
export function FamilyNoteCard({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const quick = QUICK_NOTES.map((q) => ({ value: q, label: v2.quick[q] }));
  return (
    <Card title={v2.note} optional>
      <Pills
        label={v2.note}
        role="checkbox"
        items={quick}
        isOn={(q) => s.values.content.quick.includes(q)}
        onPress={(q) => s.edit((c) => toggleQuick(c, q))}
        disabled={s.locked}
      />
      <ReportTextField
        label={v2.note}
        placeholder={v2.notePlaceholder}
        value={s.values.notes}
        onChange={(notes) => s.update({ notes })}
        disabled={s.locked}
      />
      <AttachmentsField
        reportId={s.report.id}
        files={s.report.attachments}
        onChange={s.setAttachments}
        editable={!s.locked}
        addLabel={v2.attach}
      />
    </Card>
  );
}
