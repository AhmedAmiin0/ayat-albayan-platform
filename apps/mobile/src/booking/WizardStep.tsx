import { normalizePhone } from '@ab/shared';
import { View } from 'react-native';
import type { BookFailure } from './booking-errors';
import { ConfirmStep } from './ConfirmStep';
import { ContactStep } from './ContactStep';
import type { StudentChoice, TrialDraft } from './draft';
import { InvoiceStep } from './InvoiceStep';
import { KindPills } from './KindPills';
import { kindPatch } from './package-choice';
import { PackageStep } from './PackageStep';
import { SlotStep } from './SlotStep';
import type { Step } from './steps';
import { TeacherStep } from './TeacherStep';

export type { Step } from './steps';

export interface WizardStepProps {
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

/** The wizard's current step. A new package or length clears the slot (the slots depend on it). */
export function WizardStep({ step, steps, draft, patch, go, requestId, booking }: WizardStepProps) {
  const next = steps[steps.indexOf(step) + 1] ?? 'confirm';
  if (step === 'contact') {
    // «المده» is asked here unless a package step follows (it asks the length with the package).
    return (
      <View style={{ gap: 16 }}>
        <KindPills value={draft.kind} onChange={(kind) => patch(kindPatch(kind))} />
        <ContactStep
          value={draft}
          withDuration={!steps.includes('package')}
          onChange={(p) => patch(p.durationMin ? { ...p, startsAt: null } : p)}
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
          patch({ teacher, startsAt: null });
          go(next);
        }}
      />
    );
  }
  if (step === 'package') {
    return (
      <PackageStep
        value={draft}
        onChange={(p) => patch({ ...p, startsAt: null })}
        onNext={() => go(next)}
      />
    );
  }
  if (step === 'slot' && draft.teacher) {
    return (
      <SlotStep
        teacherId={draft.teacher.id}
        tz={draft.tz}
        durationMin={draft.durationMin}
        onPick={(startsAt) => {
          patch({ startsAt });
          go(next);
        }}
      />
    );
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
        patch({ startsAt: null });
        go('slot');
      }}
      onChangeInvoice={() => go('invoice')}
      onDays={(byday) => {
        booking.reset();
        patch({ byday });
      }}
    />
  );
}
