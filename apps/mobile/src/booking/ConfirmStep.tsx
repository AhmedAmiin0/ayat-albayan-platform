import { counted, formatPhone, normalizePhone } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { DayChips } from '@/inbox/qualification/DayChips';
import { t } from '@/lib/i18n';
import { SectionLabel } from '@/students/SectionLabel';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ltr } from '@/ui/Ltr';
import { type, useTheme } from '@/theme';
import type { BookFailure } from './booking-errors';
import { ConflictNotice } from './ConflictNotice';
import type { StudentChoice, TrialDraft } from './draft';
import { DuplicateNotice } from './DuplicateNotice';
import { effectiveByday, lessonMinutes } from './package-choice';
import { whenText } from './slots';

export interface ConfirmStepProps {
  draft: TrialDraft;
  onSubmit: (choice?: StudentChoice) => void;
  busy: boolean;
  failure: BookFailure | null;
  onChangeSlot: () => void;
  /** A paid package's weekly days (the first slot's day stays in). */
  onDays: (byday: number[]) => void;
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
  if (d.pkg !== 'trial') rows.push([t.booking.steps.package, t.enums.packageSize[d.pkg]]);
  if (d.startsAt) rows.push([t.booking.steps.slot, whenText(d.startsAt, d.tz)]);
  const minutes = lessonMinutes(d);
  rows.push([t.booking.pickDuration, durations[String(minutes)] ?? String(minutes)]);
  return rows;
}

/**
 * «المراجعة»: the booking as it will be made: a trial free of charge, or a package with its weekly
 * days (chips, the first slot's day always on); then the WhatsApp confirmation the parent will get
 * (queued by the API). A clash or a similar-named child shows its way out here.
 */
export function ConfirmStep({ draft, onSubmit, busy, failure, ...props }: ConfirmStepProps) {
  const { color } = useTheme();
  const days = effectiveByday(draft);
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
      {draft.pkg === 'trial' ? (
        <AppText style={note}>{t.booking.trialFree}</AppText>
      ) : (
        <View style={{ gap: 6 }}>
          <SectionLabel>{`${t.booking.pickDays} · ${counted(t.booking.perWeek, days.length)}`}</SectionLabel>
          <DayChips value={days} onChange={props.onDays} />
        </View>
      )}
      <AppText style={note}>{t.booking.confirmationNote}</AppText>
      {failure ? (
        <FailureNotice
          failure={failure}
          busy={busy}
          onSubmit={onSubmit}
          onChangeSlot={props.onChangeSlot}
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
}: Omit<ConfirmStepProps, 'draft' | 'failure' | 'onDays'> & { failure: BookFailure }) {
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
