import { normalizePhone, packagePerWeek, wallParts } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import type { BookFailure } from '@/booking/shared/booking-errors';
import { useBookingMode } from '@/booking/shared/booking-mode';
import { ConfirmStep } from './ConfirmStep';
import { ContactStep } from './ContactStep';
import type { StudentChoice, TrialDraft } from '@/booking/trial/lib/draft';
import { InvoiceStep } from '@/booking/invoice/InvoiceStep';
import { KindPills } from './KindPills';
import { kindPatch } from '@/booking/trial/lib/package-choice';
import { PackageStep } from './PackageStep';
import { fromPicks, NO_PICKS, picksOf } from '@/booking/shared/picks';
import { SlotStep, type SlotStepProps } from './SlotStep';
import { LessonTimesStep } from '@/booking/lesson-times';
import type { Step } from '@/booking/trial/lib/steps';
import { TeacherStep } from './TeacherStep';

export type { Step } from '@/booking/trial/lib/steps';

interface WizardStepProps {
  step: Step;
  /** This wizard's steps in order: «التالي» / a pick moves to the one after `step`. */
  steps: readonly Step[];
  draft: TrialDraft;
  patch: (p: Partial<TrialDraft>) => void;
  go: (next: Step) => void;
  /** The wizard's request id: the invoice uploads under it, and the booking sends it. */
  requestId: string;
  booking: {
    busy: boolean;
    failure: BookFailure | null;
    submit: (choice?: StudentChoice) => void;
    /** Clears a failed attempt (a clash may go away with other days). */
    reset: () => void;
  };
}

/** The wizard's current step. A new package or length clears the picks (the slots depend on it). */
export function WizardStep({ step, steps, draft, patch, go, requestId, booking }: WizardStepProps) {
  const next = steps[steps.indexOf(step) + 1] ?? 'confirm';
  // A salesperson registers a trial only: no booking type to pick.
  const sales = useBookingMode() === 'sales';
  if (step === 'contact') {
    // «المده» is asked here unless a package step follows (it asks the length with the package).
    return (
      <View style={{ gap: 16 }}>
        {sales ? null : <KindPills value={draft.kind} onChange={(kind) => patch(kindPatch(kind))} />}
        <ContactStep
          value={draft}
          withDuration={!steps.includes('package')}
          onChange={(p) => patch(p.durationMin ? { ...p, ...NO_PICKS } : p)}
          onNext={() => go(next)}
        />
      </View>
    );
  }
  if (step === 'teacher') {
    return (
      <TeacherStep
        program={draft.program}
        gender={draft.gender}
        onFilter={patch}
        onPick={(teacher) => {
          patch({ teacher, ...NO_PICKS });
          go(next);
        }}
      />
    );
  }
  if (step === 'package') {
    return (
      <PackageStep
        value={draft}
        onChange={(p) => patch({ ...p, ...NO_PICKS })}
        onNext={() => go(next)}
      />
    );
  }
  if (step === 'slot' && draft.teacher) {
    const slot = { teacherId: draft.teacher.id, tz: draft.tz, durationMin: draft.durationMin };
    const onNext = () => go(next);
    const times = { slot, draft, patch, onNext };
    if (draft.kind === 'package') return <PackageTimes {...times} />;
    const onPick = (startsAt: string) => {
      patch({ startsAt });
      onNext();
    };
    return <SlotStep {...slot} onPick={onPick} />;
  }
  if (step === 'invoice') {
    const phone = normalizePhone(draft.phone);
    return (
      <InvoiceStep
        requestId={requestId}
        chatPhone={phone.ok ? phone.e164 : null}
        value={draft.invoice}
        onChange={(invoice) => patch({ invoice })}
        onNext={() => go(next)}
      />
    );
  }
  return (
    <ConfirmStep
      draft={draft}
      busy={booking.busy}
      failure={booking.failure}
      onSubmit={booking.submit}
      onChangeSlot={() => {
        patch(NO_PICKS);
        go('slot');
      }}
      onChangeInvoice={() => go('invoice')}
    />
  );
}

interface PackageTimesProps {
  slot: Pick<SlotStepProps, 'teacherId' | 'tz' | 'durationMin'>;
  draft: TrialDraft;
  patch: (p: Partial<TrialDraft>) => void;
  onNext: () => void;
}

/** A package: a date and a time per day (owner 2026-11-07), from today in the family's zone. */
function PackageTimes({ slot, draft, patch, onNext }: PackageTimesProps) {
  const [now] = useState(() => new Date().toISOString());
  const onChange = (picks: string[]) => patch(fromPicks(picks));
  const multi = { picks: picksOf(draft), onChange, onNext };
  const opens = wallParts(now, draft.tz).date;
  const start = packagePerWeek(draft.pkg) ?? 1;
  return <LessonTimesStep {...slot} opens={opens} startRows={start} multi={multi} />;
}
