import { sentMoment, type ReportFormMode } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { shape, type, useTheme } from '@/theme';

interface SentPanelProps {
  report: ReportView;
  mode: ReportFormMode;
  onEdit: () => void;
  tz: string;
  /** A send still settling: no «تعديل التقرير» until the sent version is in. */
  busy: boolean;
}

/** «تم إرسال التقرير بنجاح» (or «تم حفظ التعديل بنجاح») with when, from the server's report. */
function SentLine({ report, tz }: { report: ReportView; tz: string }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const moment = sentMoment(report);
  if (!moment) return null;
  const words = moment.kind === 'edited' ? t.reports.editSavedOk : t.reports.sentOk;
  return (
    <View style={{ backgroundColor: color.okSoft, borderRadius: shape.radius.md, padding: 12 }}>
      <AppText
        accessibilityRole="alert"
        style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}
      >
        {words.replace('{time}', whenIn(new Date(moment.at), tz, cycle))}
      </AppText>
    </View>
  );
}

/**
 * After a send (owner 2026-11-06): the confirmation, then «تعديل التقرير» while the edit window
 * is open; after it, SentNote says why it is closed.
 */
export function SentPanel({ report, mode, onEdit, tz, busy }: SentPanelProps) {
  if (mode !== 'sent' && mode !== 'closed') return null;
  return (
    <View style={{ gap: 8 }}>
      <SentLine report={report} tz={tz} />
      {mode === 'sent' && !busy ? (
        <>
          <Button variant="secondary" label={t.reports.edit} onPress={onEdit} />
          <Note>{t.reports.editHint}</Note>
        </>
      ) : null}
    </View>
  );
}
