import { sentMoment, type ReportFormMode } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t, AppText, Button, shape, type, useTheme } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

interface SentPanelProps {
  report: ReportView;
  mode: ReportFormMode;
  onEdit: () => void;
  tz: string;
  /** No edit until the sent version is in. */
  busy: boolean;
}

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

/** Edit only while the edit window is open; after it, SentNote says why. */
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
