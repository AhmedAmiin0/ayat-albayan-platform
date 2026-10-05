import { teacherName } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { requestId as newRequestId } from '@/lib/request-id';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { BookedPanel } from './BookedPanel';
import { bookFailure } from './booking-errors';
import { draftFromLead, type BookingLead, type StudentChoice, type TrialDraft } from './draft';
import { subscriptionHref } from './package-choice';
import { stepsFor, type Step } from './steps';
import { useBookTrial } from './use-book-trial';
import { WizardStep } from './WizardStep';
import { locale } from '@/lib/locale';

const stepNames = (): Record<Step, string> => ({
  contact: t.booking.steps.students,
  teacher: t.booking.steps.teacher,
  package: t.booking.steps.package,
  slot: t.booking.steps.slot,
  invoice: t.booking.invoice.label,
  confirm: t.booking.steps.review,
});

export interface TrialWizardProps {
  lead: BookingLead;
  /** The chat's «اشترك»: starts as a package (a paid size), then its subscription. */
  subscribe?: boolean;
}

/**
 * Booking for a lead (R-MOB-02, R-LEAD-06): «نوع الحجز» with الطالب → المعلم/ة → (الباقة) → الميعاد
 * → (الفاتورة) → المراجعة. From the lead screen it starts as the quick trial, from the chat's
 * «اشترك» as a package; the type pills on the first step switch between them, and the steps follow
 * (a package asks the size and the invoice, a trial neither). After a package it goes on to that
 * child's subscription (R-SUB-01). «رجوع» steps back (and clears a failed attempt); after a
 * booking it returns to the conversation.
 */
export function TrialWizard({ lead, subscribe = false }: TrialWizardProps) {
  const [draft, setDraft] = useState(() => draftFromLead(lead, subscribe ? '8' : 'trial'));
  // One per wizard, made now: the invoice uploads under it and the booking replays by it (rule 8).
  const [requestId] = useState(newRequestId);
  const steps = stepsFor(draft.kind);
  const [step, setStep] = useState<Step>('contact');
  // The answer to a duplicate_student 409 sticks, so a retry after a dropped reply sends it again.
  const [choice, setChoice] = useState<StudentChoice>(null);
  const book = useBookTrial(requestId);
  const patch = (p: Partial<TrialDraft>) => setDraft((d) => ({ ...d, ...p }));
  const at = steps.indexOf(step);
  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/inbox/${lead.id}`));
  const go = (next: Step) => {
    book.reset();
    setStep(next);
  };
  const back = () => (book.isSuccess || at === 0 ? leave() : go(steps[at - 1] ?? 'contact'));
  const submit = (c?: StudentChoice) => {
    const next = c ?? choice;
    setChoice(next);
    book.mutate({ draft, choice: next });
  };
  const position = t.booking.stepOf
    .replace('{n}', String(at + 1))
    .replace('{total}', String(steps.length));

  return (
    <>
      <ScreenHeader
        title={draft.kind === 'trial' ? t.booking.trialTitle : t.subscriptions.new}
        subtitle={book.isSuccess ? undefined : `${position} · ${stepNames()[step]}`}
        trailing={
          <Button variant="ghost" label={t.common.back} busy={book.isPending} onPress={back} />
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {book.isSuccess ? (
          <BookedPanel
            result={book.data}
            teacherName={draft.teacher ? teacherName(draft.teacher, locale) : ''}
            tz={draft.tz}
            onDone={leave}
            next={subscriptionHref(draft, book.data)}
          />
        ) : (
          <WizardStep
            step={step}
            steps={steps}
            draft={draft}
            patch={patch}
            go={go}
            requestId={requestId}
            booking={{
              busy: book.isPending,
              failure: book.isError ? bookFailure(book.error) : null,
              submit,
              reset: book.reset,
            }}
          />
        )}
      </ScrollView>
    </>
  );
}
