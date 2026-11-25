import type { SalesScheduleLesson } from '@ab/shared';
import { RIYADH_TZ } from '@ab/time';
import { useState } from 'react';
import { Button, FormAlert, ButtonRow, t } from '@ab/web-kit';
import { BookingModeContext } from '@/features/teaching/booking';
import {
  ConflictNotice,
  conflictsOf,
  durationMin,
  lessonErrorText,
  MoveReason,
  SlotPicker,
} from '@/features/teaching/schedule';
import { useSalesMove } from './sales-move-api';

interface SalesRescheduleFormProps {
  lesson: SalesScheduleLesson;
  onBack: () => void;
  onDone: () => void;
}

/** Scoped slots for this lesson only (docs/16 row 37), no clash override; the API does the move. */
export function SalesRescheduleForm({ lesson, onBack, onDone }: SalesRescheduleFormProps) {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const move = useSalesMove(lesson.id, onDone);
  const conflicts = conflictsOf(move.error);
  const pick = (slot: string | null) => {
    move.reset();
    setStartsAt(slot);
  };
  return (
    <BookingModeContext.Provider value="sales">
      <section aria-label={t.lessons.rescheduleTitle} className="grid gap-4">
        <h3 className="font-display text-h4 font-bold">{t.lessons.rescheduleTitle}</h3>
        <SlotPicker
          teacherId={lesson.teacher.id}
          durationMin={durationMin(lesson)}
          studentIds={lesson.students.map((s) => s.id)}
          studentTz={lesson.students[0]?.tz ?? RIYADH_TZ}
          near={lesson.starts_at}
          value={startsAt}
          lessonId={lesson.id}
          onPick={(slot) => pick(slot.starts_at)}
        />
        <MoveReason value={reason} onChange={setReason} />
        {conflicts ? (
          <ConflictNotice
            conflicts={conflicts}
            teacherTz={lesson.teacher.tz}
            onChangeSlot={() => pick(null)}
          />
        ) : (
          move.isError && <FormAlert>{lessonErrorText(move.error)}</FormAlert>
        )}
        <ButtonRow>
          <Button
            type="button"
            disabled={!startsAt || move.isPending}
            onClick={() => startsAt && move.mutate({ startsAt, reason })}
          >
            {move.isPending ? t.common.saving : t.lessons.rescheduleSubmit}
          </Button>
          <Button type="button" variant="secondary" onClick={onBack}>
            {t.lessons.back}
          </Button>
        </ButtonRow>
      </section>
    </BookingModeContext.Provider>
  );
}
