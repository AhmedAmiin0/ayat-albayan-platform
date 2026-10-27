import type { LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { lessonErrorText, LESSONS_KEY } from '@/features/teaching/schedule/api';
import { zonedParts, zonedToUtc } from '@/features/teaching/schedule/tz';
import { timeOptions } from '@/features/people/teachers/availability/grid';
import { t } from '@/lib/i18n/i18n';
import { proposeLesson } from '../api';
import { ClockOptions } from '@/lib/clock-options';
import { clockDir } from '@/lib/clock-text';
import { useClock } from '@/lib/clock';

export interface ProposeFormProps {
  lesson: LessonView;
  /** The teacher's zone: the date and time are picked on their own clock. */
  tz: string;
  onBack: () => void;
  onDone: (message: string) => void;
  /** Inside a Dialog (phones): the dialog carries the title and the frame. */
  bare?: boolean;
}

/**
 * «اقترح ميعاد تاني» (R-SCH-08): a native date + a time select in the teacher's zone (never free
 * text, rule 6) and an optional note. The admin approves it as a reschedule, conflicts checked there.
 */
export function ProposeForm({ lesson, tz, onBack, onDone, bare }: ProposeFormProps) {
  const queryClient = useQueryClient();
  const clock = useClock();
  const start = zonedParts(new Date(lesson.starts_at), tz);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [note, setNote] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  const send = useMutation({
    mutationFn: () =>
      proposeLesson({
        id: lesson.id,
        body: { startsAt: zonedToUtc(date, time, tz).toISOString(), ...(note.trim() ? { note: note.trim() } : {}) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(t.teacherDash.propose.sent);
    },
  });
  const today = zonedParts(new Date(), tz).date;

  return (
    <form
      noValidate
      aria-label={t.teacherDash.propose.title}
      className={bare ? 'grid gap-3' : 'grid gap-3 rounded-md bg-sunk px-4 py-3.5'}
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate();
      }}
    >
      {!bare && <h4 ref={title} tabIndex={-1} className="font-semibold outline-none">{t.teacherDash.propose.title}</h4>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.teacherDash.propose.date}>
          {(p) => <Input {...p} type="date" dir="ltr" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label={t.teacherDash.propose.time}>
          {(p) => (
            <Select {...p} dir={clockDir(clock)} value={time} onChange={(e) => setTime(e.target.value)}>
              <ClockOptions times={timeOptions(time)} />
            </Select>
          )}
        </Field>
      </div>
      <Field label={t.teacherDash.propose.note}>
        {(p) => <Input {...p} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {send.isError && <FormAlert>{lessonErrorText(send.error)}</FormAlert>}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="ghost" size="lg" onClick={onBack}>
          {t.teacherDash.propose.back}
        </Button>
        <Button type="submit" size="lg" disabled={!date || send.isPending}>
          {t.teacherDash.propose.submit}
        </Button>
      </div>
    </form>
  );
}
