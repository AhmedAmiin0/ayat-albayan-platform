import { formatPhone, normalizePhone } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/students/SectionLabel';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ltr } from '@/ui/Ltr';
import { type, useTheme } from '@/theme';
import type { BookFailure } from './booking-errors';
import { ConflictNotice } from './ConflictNotice';
import { TRIAL_MINUTES, type StudentChoice, type TrialDraft } from './draft';
import { DuplicateNotice } from './DuplicateNotice';
import { whenText } from './slots';

export interface ConfirmStepProps {
  draft: TrialDraft;
  onSubmit: (choice?: StudentChoice) => void;
  busy: boolean;
  failure: BookFailure | null;
  onChangeSlot: () => void;
}

const durations: Record<string, string | undefined> = t.enums.duration;

/** The lines «احجز» commits to: who, which parent number, with whom, when (Riyadh + family). */
function summary(d: TrialDraft): [string, string][] {
  const phone = normalizePhone(d.phone);
  const rows: [string, string][] = [
    [t.booking.studentSection, d.studentName.trim()],
    [
      t.booking.guardianSection,
      `${d.guardianName.trim()} · ${ltr(formatPhone(phone.ok ? phone.e164 : d.phone))}`,
    ],
  ];
  if (d.teacher) rows.push([t.booking.steps.teacher, d.teacher.display_name_ar]);
  if (d.startsAt) rows.push([t.booking.steps.slot, whenText(d.startsAt, d.tz)]);
  rows.push([t.booking.pickDuration, durations[String(TRIAL_MINUTES)] ?? String(TRIAL_MINUTES)]);
  return rows;
}

/**
 * Step 4 «المراجعة»: the trial as it will be booked, free of charge, and the WhatsApp confirmation
 * the parent will get (queued by the API). A clash or a similar-named child shows its way out here.
 */
export function ConfirmStep({ draft, onSubmit, busy, failure, onChangeSlot }: ConfirmStepProps) {
  const { color } = useTheme();
  const value = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  const note = { ...value, fontSize: type.size.sm, color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      {summary(draft).map(([label, text]) => (
        <View key={label} style={{ gap: 2 }}>
          <SectionLabel>{label}</SectionLabel>
          <AppText style={value}>{text}</AppText>
        </View>
      ))}
      <AppText style={note}>{t.booking.trialFree}</AppText>
      <AppText style={note}>{t.booking.confirmationNote}</AppText>
      {failure ? (
        <FailureNotice
          failure={failure}
          busy={busy}
          onSubmit={onSubmit}
          onChangeSlot={onChangeSlot}
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

/** What went wrong, with its way out: another slot, the child on file, or just the message. */
function FailureNotice({
  failure,
  busy,
  onSubmit,
  onChangeSlot,
}: Omit<ConfirmStepProps, 'draft' | 'failure'> & { failure: BookFailure }) {
  if (failure.kind === 'conflict')
    return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  if (failure.kind === 'error') return <ErrorLine message={failure.text} />;
  return (
    <DuplicateNotice
      candidates={failure.candidates}
      busy={busy}
      onUse={(existingId) => onSubmit({ existingId })}
      onNew={() => onSubmit({ force: true })}
    />
  );
}
