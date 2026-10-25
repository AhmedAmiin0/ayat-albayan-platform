import type { LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ByDayPicker } from '@/features/booking/ByDayPicker';
import { isMakeup } from '@/features/booking/contract';
import { ruleFromSlot } from '@/features/booking/draft';
import { pickedText } from '@/features/booking/SlotStep';
import { t } from '@/lib/i18n';
import { conflictsOf, lessonErrorText, LESSONS_KEY, rescheduleLesson } from './api';
import { ConflictNotice } from './ConflictNotice';
import { durationMin } from './lessons';
import { familyTz, rescheduleBody, seriesDays } from './reschedule';
import { ScopeRadios, type Scope } from './ScopeRadios';
import { SlotPicker } from './SlotPicker';

export interface RescheduleFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
}

/**
 * «تغيير الميعاد» (R-SCH-07, journey 4): pick the new start on the teacher's slot grid; a clash
 * comes back as a 409 and is shown in Arabic with «اختار ميعاد تاني» or book-anyway + reason.
 */
export function RescheduleForm({ lesson, onBack, onDone }: RescheduleFormProps) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('one');
  const [startsAt, setStartsAt] = useState<string | null>(null);
  // null = untouched: the old rule's days, shifted to the new slot (seriesDays).
  const [picked, setByday] = useState<number[] | null>(null);
  const tz = familyTz(lesson);
  const byday = picked ?? (startsAt ? seriesDays(lesson, startsAt) : []);
  const move = useMutation({
    mutationFn: (override?: string) => {
      const body = startsAt ? rescheduleBody({ lesson, scope, startsAt, byday, override }) : null;
      if (!body) throw new Error('nothing picked');
      return rescheduleLesson({ id: lesson.id, body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(t.lessons.rescheduled);
    },
  });
  const conflicts = conflictsOf(move.error);

  return (
    <section aria-label={t.lessons.rescheduleTitle} className="grid gap-4">
      <h3 className="font-display text-h4 font-bold">{t.lessons.rescheduleTitle}</h3>
      <ScopeRadios value={scope} onChange={setScope} ruleAllowed={lesson.rule_id !== null && !isMakeup(lesson)} label={t.lessons.scopeLabelMove} />
      <div className="grid gap-1.5">
        <p className="text-xs font-semibold text-ink-2">{t.lessons.newTime}</p>
        <SlotPicker
          teacherId={lesson.teacher.id}
          durationMin={durationMin(lesson)}
          studentIds={lesson.students.map((s) => s.id)}
          studentTz={tz}
          near={lesson.starts_at}
          value={startsAt}
          onPick={(slot) => {
            move.reset();
            setStartsAt(slot.starts_at);
            setByday(null);
          }}
        />
      </div>
      {startsAt ? (
        <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
          {t.booking.picked.replace('{when}', pickedText(startsAt, tz))}
        </p>
      ) : (
        <p className="text-xs text-ink-3">{t.lessons.newTimeHint}</p>
      )}
      {scope === 'rule' && startsAt && (
        <ByDayPicker fixed={ruleFromSlot(startsAt, tz).weekday} value={[...new Set([ruleFromSlot(startsAt, tz).weekday, ...byday])]} onChange={setByday} />
      )}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={lesson.teacher.tz}
          busy={move.isPending}
          onChangeSlot={() => {
            move.reset();
            setStartsAt(null);
          }}
          onOverride={(reason) => move.mutate(reason)}
        />
      ) : (
        move.isError && <FormAlert>{lessonErrorText(move.error)}</FormAlert>
      )}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t.lessons.back}
        </Button>
        {!conflicts && (
          <Button type="button" disabled={!startsAt || move.isPending} onClick={() => move.mutate(undefined)}>
            {t.lessons.rescheduleSubmit}
          </Button>
        )}
      </div>
    </section>
  );
}
