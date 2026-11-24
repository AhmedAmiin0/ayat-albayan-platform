import type { TrialHistory } from '@ab/shared';
import type { Program } from '@ab/catalog';
import { backOr } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { bookFailure } from '@/booking';
import { t, BackButton, ScreenHeader } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { useTrialDate } from '@/trial-date/lib/queries';
import { trialDateBody, trialDateDraft, type TrialDateDraft } from '@/trial-date/lib/trial-date-body';
import { TrialDateDone } from '@/trial-date/components/TrialDateDone';
import { TrialDateReview } from '@/trial-date/components/TrialDateReview';
import { TrialHistoryList } from '@/trial-date/components/TrialHistoryList';
import { TrialTeacherPick } from '@/trial-date/components/TrialTeacherPick';
import { TrialSlotStep } from '@/trial-date/fields/TrialSlotStep';

type Step = 'teacher' | 'slot' | 'confirm';
const STEPS: readonly Step[] = ['teacher', 'slot', 'confirm'];
const stepName = (s: Step) => ({ teacher: t.booking.steps.teacher, slot: t.booking.steps.slot, confirm: t.booking.steps.review })[s];

interface TrialDateWizardProps {
  history: TrialHistory;
  title: string;
  program: Program;
  fallback: () => void;
}

/** One request id per wizard (R-SCH-06/07, rule 8); the upcoming trial does not count as busy. */
export function TrialDateWizard({ history, title, program, fallback }: TrialDateWizardProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
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
  const leave = () => backOr(fallback);
  const back = () => (book.isSuccess || at === 0 ? leave() : go(STEPS[at - 1] ?? 'teacher'));
  const body = trialDateBody(draft, requestId);
  const position = t.booking.stepOf.replace('{n}', String(at + 1)).replace('{total}', String(STEPS.length));
  return (
    <>
      <ScreenHeader
        title={title}
        subtitle={book.isSuccess ? undefined : `${position} · ${stepName(step)}`}
        leading={<BackButton busy={book.isPending} onPress={back} />}
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
          <TrialSlotStep
            teacherId={draft.teacher.id}
            tz={draft.tz}
            durationMin={draft.durationMin}
            excludeLessonId={history.upcoming_id ?? undefined}
            onLength={(durationMin) => patch({ durationMin, startsAt: null })}
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
            onLink={(meetingLink) => patch({ meetingLink })}
            submit={{ busy: book.isPending, failure: book.isError ? bookFailure(book.error, cycle, tz) : null, onSubmit: () => body && book.mutate(body) }}
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
