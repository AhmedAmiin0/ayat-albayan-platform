import { teacherName } from '@ab/shared';
import type { Gender, Program } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTabOpen } from '@/auth/use-tab-open';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Button } from '@/core/ui/primitives/Button';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BookedPanel } from './shared/BookedPanel';
import { bookFailure } from './shared/booking-errors';
import { InvoiceStep } from './InvoiceStep';
import { makeupDraft, type MakeupDraft, type MakeupSource } from './makeup-draft';
import { MakeupConfirm } from './MakeupConfirm';
import { MissedHeader } from './MissedHeader';
import { SlotStep } from './trial/components/SlotStep';
import { stepsFor, type Step } from './trial/lib/steps';
import { TeacherStep } from './trial/components/TeacherStep';
import { useBookMakeup } from './use-book-makeup';
import { locale } from '@/core/lib/i18n/locale';

type Filter = { program: Program; gender: Gender | null };

/**
 * «حجز تعويضي» for one missed lesson (R-SCH-10): المعلم/ة (the original's, or another) → الميعاد →
 * الفاتورة → المراجعة. The student and the lesson length come from the missed lesson (no contact
 * step, no package, no lead). The invoice is required like a package's; there is no «من الشات»
 * here because a lesson row knows no guardian number. ponytail: the teacher filter starts at
 * quran (LessonView has no program); pass it down when the row grows one.
 */
export function MakeupWizard({ source }: { source: MakeupSource }) {
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
  const leave = () => (router.canGoBack() ? router.back() : router.replace(toSchedule ? '/schedule' : '/more'));
  const back = () => (book.isSuccess || at === 0 ? leave() : go(steps[at - 1] ?? 'teacher'));
  const position = t.booking.stepOf
    .replace('{n}', String(at + 1))
    .replace('{total}', String(steps.length));

  return (
    <>
      <ScreenHeader
        title={t.booking.makeup.title}
        subtitle={book.isSuccess ? undefined : position}
        trailing={
          <Button variant="ghost" label={t.common.back} busy={book.isPending} onPress={back} />
        }
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
            failure={book.isError ? bookFailure(book.error) : null}
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
