import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import type { Lead } from '@/inbox/types';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { BookedPanel } from './BookedPanel';
import { bookFailure } from './booking-errors';
import { ConfirmStep } from './ConfirmStep';
import { ContactStep } from './ContactStep';
import { draftFromLead, type StudentChoice, type TrialDraft } from './draft';
import { SlotStep } from './SlotStep';
import { TeacherStep } from './TeacherStep';
import { useBookTrial } from './use-book-trial';

const STEPS = ['contact', 'teacher', 'slot', 'confirm'] as const;
type Step = (typeof STEPS)[number];
const stepNames = (): Record<Step, string> => ({
  contact: t.booking.steps.students,
  teacher: t.booking.steps.teacher,
  slot: t.booking.steps.slot,
  confirm: t.booking.steps.review,
});

/**
 * «حجز حلقة تجريبية» from a lead (R-MOB-02, R-LEAD-06): الطالب → المعلم/ة → الميعاد → المراجعة.
 * «رجوع» steps back (and clears a failed attempt); after the booking it returns to the lead.
 */
export function TrialWizard({ lead }: { lead: Lead }) {
  const [draft, setDraft] = useState(() => draftFromLead(lead));
  const [step, setStep] = useState<Step>('contact');
  // The answer to a duplicate_student 409 sticks, so a retry after a dropped reply sends it again.
  const [choice, setChoice] = useState<StudentChoice>(null);
  const book = useBookTrial();
  const patch = (p: Partial<TrialDraft>) => setDraft((d) => ({ ...d, ...p }));
  const at = STEPS.indexOf(step);
  const leave = () => (router.canGoBack() ? router.back() : router.replace(`/inbox/${lead.id}`));
  const go = (next: Step) => {
    book.reset();
    setStep(next);
  };
  const back = () => (book.isSuccess || at === 0 ? leave() : go(STEPS[at - 1] ?? 'contact'));
  const submit = (c?: StudentChoice) => {
    const next = c ?? choice;
    setChoice(next);
    book.mutate({ draft, choice: next });
  };

  return (
    <>
      <ScreenHeader
        title={t.booking.trialTitle}
        subtitle={
          book.isSuccess
            ? undefined
            : `${t.booking.stepOf.replace('{n}', String(at + 1)).replace('{total}', String(STEPS.length))} · ${stepNames()[step]}`
        }
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
          />
        ) : step === 'contact' ? (
          <ContactStep value={draft} onChange={patch} onNext={() => go('teacher')} />
        ) : step === 'teacher' ? (
          <TeacherStep
            program={draft.program}
            gender={draft.gender}
            onFilter={patch}
            onPick={(teacher) => {
              patch({ teacher, startsAt: null });
              go('slot');
            }}
          />
        ) : step === 'slot' && draft.teacher ? (
          <SlotStep
            teacherId={draft.teacher.id}
            tz={draft.tz}
            onPick={(startsAt) => {
              patch({ startsAt });
              go('confirm');
            }}
          />
        ) : (
          <ConfirmStep
            draft={draft}
            busy={book.isPending}
            failure={book.isError ? bookFailure(book.error) : null}
            onSubmit={submit}
            onChangeSlot={() => {
              patch({ startsAt: null });
              go('slot');
            }}
          />
        )}
      </ScrollView>
    </>
  );
}
