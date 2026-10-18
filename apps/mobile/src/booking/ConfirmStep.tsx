import { counted } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/students/SectionLabel';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { type, useTheme } from '@/theme';
import type { BookFailure } from './booking-errors';
import { summary, type SummaryRow } from './confirm-summary';
import { FailureNotice, PackageDaysNote } from './ConfirmNotices';
import type { StudentChoice, TrialDraft } from './draft';
import { effectiveByday } from './package-choice';
import { picksOf } from './picks';
import { PicksList } from './PicksList';

export interface ConfirmStepProps {
  draft: TrialDraft;
  onSubmit: (choice?: StudentChoice) => void;
  busy: boolean;
  failure: BookFailure | null;
  onChangeSlot: () => void;
  /** Back to «الفاتورة» (a refused or expired one). */
  onChangeInvoice: () => void;
}

/** The label/value lines of a review, as the trial and the makeup both show them. */
export function SummaryList({ rows }: { rows: SummaryRow[] }) {
  const { color } = useTheme();
  const value = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  return rows.map(([label, text]) => (
    <View key={label} style={{ gap: 2 }}>
      <SectionLabel>{label}</SectionLabel>
      <AppText style={value}>{text}</AppText>
    </View>
  ));
}

/**
 * «المراجعة»: the booking as it will be made: a trial free of charge, or a package with its weekly
 * days (each with its time, picked on the slot step) and its invoice; then the WhatsApp confirmation the
 * parent will get (queued by the API). A clash or a similar-named child shows its way out here.
 */
export function ConfirmStep({ draft, onSubmit, busy, failure, ...props }: ConfirmStepProps) {
  const { color } = useTheme();
  const days = effectiveByday(draft);
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
  return (
    <View style={{ gap: 14 }}>
      <SummaryList rows={summary(draft)} />
      {draft.pkg === 'trial' ? (
        <AppText style={note}>{t.booking.trialFree}</AppText>
      ) : (
        <View style={{ gap: 6 }}>
          <PicksList picks={picksOf(draft)} tz={draft.tz} />
          <AppText style={note}>{counted(t.booking.perWeek, days.length)}</AppText>
          <PackageDaysNote pkg={draft.pkg} days={days.length} />
        </View>
      )}
      <AppText style={note}>{t.booking.confirmationNote}</AppText>
      {failure ? (
        <FailureNotice
          failure={failure}
          busy={busy}
          onSubmit={onSubmit}
          onChangeSlot={props.onChangeSlot}
          onChangeInvoice={props.onChangeInvoice}
        />
      ) : null}
      {failure?.kind === 'conflict' || failure?.kind === 'duplicate' ? null : (
        <Button
          label={busy ? t.booking.submitting : t.booking.submit}
          busy={busy}
          onPress={() => onSubmit()}
        />
      )}
    </View>
  );
}
