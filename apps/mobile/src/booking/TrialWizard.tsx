import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { BookedPanel } from './BookedPanel';
import { bookFailure } from './booking-errors';
import { draftFromLead, type BookingLead, type StudentChoice, type TrialDraft } from './draft';
import { subscriptionHref } from './package-choice';
import { useBookTrial } from './use-book-trial';
import { WizardStep, type Step } from './WizardStep';

/** The lead screen's quick trial, or the chat's «اشترك» (a package step, a paid size first). */
const modeOf = (subscribe: boolean) =>
  subscribe
    ? {
        steps: ['contact', 'teacher', 'package', 'slot', 'confirm'] as const,
        pkg: '8' as const,
        title: t.subscriptions.new,
      }
    : {
        steps: ['contact', 'teacher', 'slot', 'confirm'] as const,
        pkg: 'trial' as const,
        title: t.booking.trialTitle,
      };
const stepNames = (): Record<Step, string> => ({
  contact: t.booking.steps.students,
  teacher: t.booking.steps.teacher,
  package: t.booking.steps.package,
  slot: t.booking.steps.slot,
  confirm: t.booking.steps.review,
});

export interface TrialWizardProps {
  lead: BookingLead;
  /** The chat's «اشترك»: a package step (a paid package allowed), then its subscription. */
  subscribe?: boolean;
}

/**
 * Booking for a lead (R-MOB-02, R-LEAD-06): الطالب → المعلم/ة → (الباقة) → الميعاد → المراجعة.
 * From the lead screen it is the quick trial; from the chat's «اشترك» it also offers the paid
 * packages, and after one is booked it goes on to that child's subscription (R-SUB-01).
 * «رجوع» steps back (and clears a failed attempt); after a trial it returns to the conversation.
 */
export function TrialWizard({ lead, subscribe = false }: TrialWizardProps) {
  const [mode] = useState(() => modeOf(subscribe));
  const steps: readonly Step[] = mode.steps;
  const [draft, setDraft] = useState(() => draftFromLead(lead, mode.pkg));
  const [step, setStep] = useState<Step>('contact');
  // The answer to a duplicate_student 409 sticks, so a retry after a dropped reply sends it again.
  const [choice, setChoice] = useState<StudentChoice>(null);
  const book = useBookTrial();
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
        title={mode.title}
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
            teacherName={draft.teacher?.display_name_ar ?? ''}
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
