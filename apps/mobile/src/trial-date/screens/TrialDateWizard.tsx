import type { Program, TrialHistory } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { bookFailure } from '@/booking/shared/booking-errors';
import { SlotStep } from '@/booking/trial/components/SlotStep';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle } from '@/core/lib/clock';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Button } from '@/core/ui/primitives/Button';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTrialDate } from '@/trial-date/lib/queries';
import { trialDateBody, trialDateDraft, type TrialDateDraft } from '@/trial-date/lib/trial-date-body';
import { TrialDateDone } from '@/trial-date/components/TrialDateDone';
import { TrialDateReview } from '@/trial-date/components/TrialDateReview';
import { TrialHistoryList } from '@/trial-date/components/TrialHistoryList';
import { TrialTeacherPick } from '@/trial-date/components/TrialTeacherPick';

type Step = 'teacher' | 'slot' | 'confirm';
const STEPS: readonly Step[] = ['teacher', 'slot', 'confirm'];
const stepName = (s: Step) => ({ teacher: t.booking.steps.teacher, slot: t.booking.steps.slot, confirm: t.booking.steps.review })[s];

interface TrialDateWizardProps {
  history: TrialHistory;
  title: string;
  program: Program;
  /** Where «إغلاق» goes without a screen to go back to. */
  fallback: () => void;
}

/**
 * «موعد تجريبي جديد» (R-SCH-06/07): المعلم/ة (the last trial's, or another) → الموعد (the booking's
 * slot grid, the next 7 days, the upcoming trial not busy) → المراجعة → POST …/trial-date with one
 * request id per wizard (rule 8). The history sits over the first step.
 */
export function TrialDateWizard({ history, title, program, fallback }: TrialDateWizardProps) {
  const cycle = useClockCycle();
  const [draft, setDraft] = useState<TrialDateDraft>(() => trialDateDraft(history));
  const [requestId] = useState(newRequestId);
  const [step, setStep] = useState<Step>('teacher');
  const book = useTrialDate(history.student_id);
  const patch = (p: Partial<TrialDateDraft>) => setDraft((d) => ({ ...d, ...p }));
  const at = STEPS.indexOf(step);
  const go = (next: Step) => {
    book.reset();
    setStep(next);
  };
  const leave = () => (router.canGoBack() ? router.back() : fallback());
  const back = () => (book.isSuccess || at === 0 ? leave() : go(STEPS[at - 1] ?? 'teacher'));
  const body = trialDateBody(draft, requestId);
  const position = t.booking.stepOf.replace('{n}', String(at + 1)).replace('{total}', String(STEPS.length));
  return (
    <>
      <ScreenHeader
        title={title}
        subtitle={book.isSuccess ? undefined : `${position} · ${stepName(step)}`}
        trailing={<Button variant="ghost" label={t.common.back} busy={book.isPending} onPress={back} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {book.isSuccess ? (
          <TrialDateDone result={book.data} teacherName={draft.teacher?.name ?? ''} tz={draft.tz} onClose={leave} />
        ) : step === 'teacher' ? (
          <View style={{ gap: 16 }}>
            <TrialHistoryList history={history} />
            <TrialTeacherPick
              current={draft.teacher}
              program={history.program ?? program}
              gender={history.teacher_gender_pref}
              onKeep={() => go('slot')}
              onPick={(teacher) => {
                patch({ teacher, startsAt: null });
                go('slot');
              }}
            />
          </View>
        ) : step === 'slot' && draft.teacher ? (
          <SlotStep
            teacherId={draft.teacher.id}
            tz={draft.tz}
            durationMin={draft.durationMin}
            excludeLessonId={history.upcoming_id ?? undefined}
            onPick={(startsAt) => {
              patch({ startsAt });
              go('confirm');
            }}
          />
        ) : (
          <TrialDateReview
            draft={draft}
            history={history}
            body={body}
            submit={{ busy: book.isPending, failure: book.isError ? bookFailure(book.error, cycle) : null, onSubmit: () => body && book.mutate(body) }}
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
