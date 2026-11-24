import { teacherName } from '@ab/schedule';
import type { Gender, Program } from '@ab/catalog';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { useTabOpen } from '@/core/auth/use-tab-open';
import { ScrollView, View } from 'react-native';
import { t, BackButton, Button, ScreenHeader, locale } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { BookedPanel } from '@/booking/shared/BookedPanel';
import { bookFailure } from '@/booking/shared/booking-errors';
import { InvoiceStep } from '@/booking/invoice/InvoiceStep';
import { makeupDraft, type MakeupDraft, type MakeupSource } from './makeup-draft';
import { MakeupConfirm } from './MakeupConfirm';
import { MissedHeader } from './MissedHeader';
import { SlotStep } from '@/booking/trial/components/SlotStep';
import { stepsFor, type Step } from '@/booking/trial/lib/steps';
import { TeacherStep } from '@/booking/trial/components/TeacherStep';
import { useBookMakeup } from './use-book-makeup';

type Filter = { program: Program; gender: Gender | null };

/** R-SCH-10: teacher filter starts at quran because LessonView has no program yet. */
export function MakeupWizard({ source }: { source: MakeupSource }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const toSchedule = useTabOpen('schedule');
  const [draft, setDraft] = useState<MakeupDraft>(() => makeupDraft(source));
  const [requestId] = useState(newRequestId);
  const [filter, setFilter] = useState<Filter>({ program: 'quran', gender: null });
  const steps = stepsFor('makeup');
  const [step, setStep] = useState<Step>('teacher');
  const book = useBookMakeup(requestId);
  const patch = (p: Partial<MakeupDraft>) => setDraft((d) => ({ ...d, ...p }));
  const at = steps.indexOf(step);
  const go = (next: Step) => {
    book.reset();
    setStep(next);
  };
  const onward = () => go(steps[at + 1] ?? 'confirm');
  const leave = () => backWithin(toSchedule ? '/schedule' : '/more');
  const back = () => (book.isSuccess || at === 0 ? leave() : go(steps[at - 1] ?? 'teacher'));
  const position = t.booking.stepOf
    .replace('{n}', String(at + 1))
    .replace('{total}', String(steps.length));

  return (
    <>
      <ScreenHeader
        title={t.booking.makeup.title}
        subtitle={book.isSuccess ? undefined : position}
        leading={<BackButton busy={book.isPending} onPress={back} />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <MissedHeader source={source} />
        {book.isSuccess ? (
          <BookedPanel
            makeup
            result={book.data}
            teacherName={draft.teacher.name}
            tz={source.tz}
            onDone={leave}
          />
        ) : step === 'teacher' ? (
          <View style={{ gap: 12 }}>
            <Button
              label={t.booking.mobile.keepTeacher.replace('{teacher}', draft.teacher.name)}
              onPress={onward}
            />
            <TeacherStep
              {...filter}
              onFilter={(f) => setFilter((old) => ({ ...old, ...f }))}
              onPick={(teacher) => {
                patch({ teacher: { id: teacher.id, name: teacherName(teacher, locale) }, startsAt: null });
                onward();
              }}
            />
          </View>
        ) : step === 'slot' ? (
          <SlotStep
            teacherId={draft.teacher.id}
            tz={source.tz}
            durationMin={source.durationMin}
            onPick={(startsAt) => {
              patch({ startsAt });
              onward();
            }}
          />
        ) : step === 'invoice' ? (
          <InvoiceStep
            requestId={requestId}
            value={draft.invoice}
            onChange={(invoice) => patch({ invoice })}
            onNext={onward}
          />
        ) : (
          <MakeupConfirm
            draft={draft}
            busy={book.isPending}
            failure={book.isError ? bookFailure(book.error, cycle, tz) : null}
            onSubmit={() => book.mutate(draft)}
            onChangeSlot={() => {
              patch({ startsAt: null });
              go('slot');
            }}
            onChangeInvoice={() => go('invoice')}
          />
        )}
      </ScrollView>
    </>
  );
}
