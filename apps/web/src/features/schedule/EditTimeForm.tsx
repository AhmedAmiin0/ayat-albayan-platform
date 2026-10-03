import type { LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { t } from '@/lib/i18n';
import { conflictsOf, editLessonTime, errorCode, lessonErrorText, LESSONS_KEY } from './api';
import { ConflictNotice } from './ConflictNotice';
import { changeOf, editBody, moveDays, startsAtOf, timesFor, willNotify } from './edit-time';
import { timeEditMode, type TimeEditResult } from './edit-time.contract';
import { EditTimeConfirm } from './EditTimeConfirm';
import { EditTimeDone, needsFollowUp, savedMessage } from './EditTimeDone';
import { EditTimeFields, type FieldState } from './EditTimeFields';
import { durationMin } from './lessons';
import { zonedParts } from './tz';

export interface EditTimeFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
}

/**
 * «عدّل الوقت» (R-SCH-11): edits THIS lesson in place (same report, same payments; «غيّر الميعاد»
 * is the one that closes it and opens a twin). Scheduled lessons move (`move`); held ones get their
 * recorded start / length corrected the same day with a reason (`correct`). Clashes come back as a
 * 409 and are shown with «اختار ميعاد تاني» or book-anyway + reason, as in the reschedule form.
 */
export function EditTimeForm({ lesson, onBack, onDone }: EditTimeFormProps) {
  const queryClient = useQueryClient();
  const mode = timeEditMode(lesson) ?? 'move';
  const tz = lesson.teacher.tz;
  const was = { startsAt: lesson.starts_at, durationMin: durationMin(lesson) };
  const start = zonedParts(new Date(lesson.starts_at), tz);
  const [now] = useState(() => new Date());
  const [value, setValue] = useState<FieldState>({ date: start.date, time: start.time, durationMin: was.durationMin, reason: '' });
  const [notify, setNotify] = useState(true);
  const [missing, setMissing] = useState(false);
  const [done, setDone] = useState<TimeEditResult | null>(null);

  const choice = { ...value, tz };
  const change = changeOf(was, choice);
  const changed = change.start || change.duration;
  const canNotify = willNotify(mode, change, { ...choice, now });
  const sameDay = [...new Set([tz, ...lesson.students.map((s) => s.tz)])].map((z) => ({
    tz: z,
    date: zonedParts(new Date(lesson.starts_at), z).date,
  }));

  const save = useMutation({
    mutationFn: (override?: string) =>
      editLessonTime({
        id: lesson.id,
        body: editBody({ mode, expectedStartsAt: lesson.starts_at, choice, reason: value.reason, notify, override }),
      }),
    onSuccess: async (result) => {
      if (needsFollowUp(result)) {
        setDone(result);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(savedMessage(result));
    },
    // Someone else moved it: refresh what the drawer shows, but don't let this form overwrite them.
    onError: (error) => {
      if (errorCode(error) === 'stale_time') void queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
  });
  const conflicts = conflictsOf(save.error);
  const stale = errorCode(save.error) === 'stale_time';
  const patch = (p: Partial<FieldState>) => {
    if (!stale) save.reset();
    setMissing(false);
    setValue((v) => ({ ...v, ...p }));
  };
  const submit = () => {
    if (mode === 'correct' && !value.reason.trim()) setMissing(true);
    else save.mutate(undefined);
  };
  const title = mode === 'correct' ? t.lessons.timeEdit.correctTitle : t.lessons.timeEdit.title;

  if (done) return <EditTimeDone result={done} onClose={onDone} />;
  return (
    <section aria-label={title} className="grid gap-4">
      <h3 className="font-display text-h4 font-bold">{title}</h3>
      {mode === 'move' && <p className="text-xs text-ink-3">{t.lessons.timeEdit.vsReschedule}</p>}
      <EditTimeFields
        mode={mode}
        tz={tz}
        value={value}
        onChange={patch}
        times={timesFor(mode, choice, { now, sameDay })}
        days={moveDays(now, tz)}
        reasonMissing={missing}
      />
      {changed ? (
        <EditTimeConfirm
          lesson={lesson}
          mode={mode}
          next={{ startsAt: startsAtOf(choice), durationMin: value.durationMin }}
          change={change}
          canNotify={canNotify}
          notify={notify}
          onNotify={setNotify}
        />
      ) : (
        <p className="text-xs text-ink-3">{t.lessons.timeEdit.unchanged}</p>
      )}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={tz}
          busy={save.isPending}
          onChangeSlot={() => save.reset()}
          onOverride={(reason) => save.mutate(reason)}
        />
      ) : (
        save.isError && <FormAlert>{lessonErrorText(save.error)}</FormAlert>
      )}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button type="button" variant="ghost" onClick={onBack}>
          {t.lessons.back}
        </Button>
        {!conflicts && (
          <Button type="button" disabled={!changed || stale || save.isPending} onClick={submit}>
            {t.lessons.timeEdit.submit}
          </Button>
        )}
      </div>
    </section>
  );
}
