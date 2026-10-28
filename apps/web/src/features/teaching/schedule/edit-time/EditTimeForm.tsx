import type { LessonView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ButtonRow } from '@/components/ui/layout/button-row';
import { t } from '@/lib/i18n/i18n';
import { conflictsOf, editLessonTime, errorCode, lessonErrorText, LESSONS_KEY } from '../api';
import { ConflictNotice } from '../reschedule/ConflictNotice';
import { changeOf, editBody, moveDays, startsAtOf, timesFor, validLength, willNotify } from './edit-time';
import { lengthText, lockedText, payoutLock } from './edit-time-text';
import { timeEditMode, type TimeEditResult } from './edit-time.contract';
import { EditTimeConfirm } from './EditTimeConfirm';
import { EditTimeDone, needsFollowUp, savedMessage } from './EditTimeDone';
import { EditTimeFields, type FieldState } from './EditTimeFields';
import { durationMin } from '../lesson/lessons';
import { zonedParts } from '../tz';

export interface EditTimeFormProps {
  lesson: LessonView;
  onBack: () => void;
  onDone: (message: string) => void;
}

const OVERRIDE = { override: t.lessons.timeEdit.overrideEdit, reason: t.lessons.timeEdit.overrideReasonEdit };

/**
 * «عدّل الوقت» (R-SCH-11): edits THIS lesson in place (same report, same payments; «غيّر الميعاد»
 * is the one that closes it and opens a twin). Scheduled lessons move (`move`); held ones get their
 * recorded start / length corrected the same day with a reason (`correct`). Clashes come back as a
 * 409 and are shown with «اختار ميعاد تاني» or save-anyway + reason. A length change refused by a
 * closed payout month names the month and offers the old length back (a start-only fix still saves).
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
  // A closed payout month refused a length change: kept here, outside save.reset(), until the length is back.
  const [lock, setLock] = useState<{ month: string; status: string } | null>(null);

  const choice = { ...value, tz };
  const change = changeOf(was, choice);
  const changed = change.start || change.duration;
  const sameDay = [...new Set([tz, ...lesson.students.map((s) => s.tz)])].map((z) => ({ tz: z, date: zonedParts(new Date(lesson.starts_at), z).date }));

  const save = useMutation({
    mutationFn: (override?: string) =>
      editLessonTime({
        id: lesson.id,
        body: editBody({ mode, expectedStartsAt: lesson.starts_at, expectedEndsAt: lesson.ends_at, choice, reason: value.reason, notify, override }),
      }),
    onSuccess: async (result) => {
      if (needsFollowUp(result)) return setDone(result);
      await queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      onDone(savedMessage(result));
    },
    // Someone else moved it: refresh what the drawer shows, but don't let this form overwrite them.
    onError: (error) => {
      setLock(payoutLock(error) ?? lock);
      if (errorCode(error) === 'stale_time') void queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
  });
  const conflicts = conflictsOf(save.error);
  const stale = errorCode(save.error) === 'stale_time';
  const locked = lock !== null && change.duration;
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
  const names = Object.fromEntries(lesson.students.map((s) => [s.id, s.name]));

  if (done) return <EditTimeDone result={done} onClose={onDone} />;
  return (
    <section aria-label={title} className="grid gap-4">
      <h3 className="font-display text-h4 font-bold">{title}</h3>
      {mode === 'move' && <p className="text-sm text-ink-2">{t.lessons.timeEdit.vsReschedule}</p>}
      <EditTimeFields
        mode={mode}
        tz={tz}
        value={value}
        onChange={patch}
        times={timesFor(mode, choice, { now, sameDay })}
        days={moveDays(now, tz)}
        reasonMissing={missing}
      />
      {!validLength(value.durationMin) ? null : changed ? (
        <EditTimeConfirm
          lesson={lesson}
          mode={mode}
          next={{ startsAt: startsAtOf(choice), durationMin: value.durationMin }}
          change={change}
          canNotify={willNotify(mode, change, { ...choice, now })}
          notify={notify}
          onNotify={setNotify}
          payoutLocked={locked}
        />
      ) : (
        <p className="text-xs text-ink-3">{t.lessons.timeEdit.unchanged}</p>
      )}
      {conflicts ? (
        <ConflictNotice
          conflicts={conflicts}
          teacherTz={tz}
          busy={save.isPending}
          labels={OVERRIDE}
          initialReason={value.reason.trim()}
          studentNames={names}
          onChangeSlot={() => save.reset()}
          onOverride={(reason) => save.mutate(reason)}
        />
      ) : locked && lock ? (
        <FormAlert>
          {lockedText(lock)}
          <span className="mt-1 block">{t.lessons.timeEdit.startOnly}</span>
          <Button type="button" variant="ghost" size="sm" className="mt-1 -ms-3" onClick={() => patch({ durationMin: was.durationMin })}>
            {t.lessons.timeEdit.restoreLength.replace('{len}', lengthText(was.durationMin))}
          </Button>
        </FormAlert>
      ) : (
        save.isError && <FormAlert>{lessonErrorText(save.error)}</FormAlert>
      )}
      <ButtonRow className="sticky bottom-0 z-10 -mx-5 -mb-4 border-t border-rule bg-card px-5 py-3">
        {!conflicts && (
          <Button type="button" disabled={!changed || !validLength(value.durationMin) || stale || locked || save.isPending} onClick={submit}>
            {t.lessons.timeEdit.submit}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onBack}>
          {t.lessons.back}
        </Button>
      </ButtonRow>
    </section>
  );
}
