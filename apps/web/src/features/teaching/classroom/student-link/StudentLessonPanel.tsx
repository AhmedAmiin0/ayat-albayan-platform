import { lessonWhenAt, type ClockCycle, type StudentLinkLesson } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { classroomErrorText, opensAtOf } from '../room/livekit/errors';
import { isLessonNow, viewerTz, windowStateAt } from './student-link';
import { RecordedNotice } from '../recordings/RecordedNotice';
import { opensAtText } from '../room/livekit/window-hint';
import { useClock } from '@/lib/clock';

interface Props {
  lesson: StudentLinkLesson;
  firstName: string;
  now: Date;
  pending: boolean;
  error: unknown;
  onJoin: (name: string) => void;
}

const problemText = (error: unknown, cycle: ClockCycle): string => {
  const opens = opensAtOf(error);
  return opens ? opensAtText(opens, cycle) : classroomErrorText(error);
};

/** «حلقتك القادمة / الآن»: when (viewer's clock), with whom, an optional name and the big «ادخل الحلقة». */
export function StudentLessonPanel({ lesson, firstName, now, pending, error, onJoin }: Props) {
  const clock = useClock();
  const [name, setName] = useState('');
  const state = windowStateAt(lesson.window, now);
  const title = isLessonNow(lesson, now) ? t.studentLink.page.now : t.studentLink.page.next;
  const waiting = state === 'early' ? opensAtText(lesson.window.opens_at, clock.cycle) : t.classroom.closedHint;
  return (
    <>
      <section aria-label={title} className="grid gap-1">
        <h2 className="font-display text-h3 font-bold">{title}</h2>
        <p className="text-body">{lessonWhenAt(new Date(lesson.starts_at), { tz: viewerTz(), ...clock })}</p>
        {lesson.teacher_name && <p className="text-sm text-ink-2">{t.studentLink.page.with.replace('{teacher}', lesson.teacher_name)}</p>}
      </section>
      <Field label={t.studentLink.page.name}>
        {(p) => <Input {...p} value={name} maxLength={30} autoComplete="off" placeholder={firstName} onChange={(e) => setName(e.target.value)} />}
      </Field>
      {error !== null && <FormAlert>{problemText(error, clock.cycle)}</FormAlert>}
      <RecordedNotice />
      <Button type="button" size="lg" disabled={state !== 'open' || pending} onClick={() => onJoin(name.trim())}>
        {pending ? t.classroom.joining : t.studentLink.page.enter}
      </Button>
      {state !== 'open' && <p className="text-xs text-ink-3">{`${waiting} · ${t.studentLink.page.autoHint}`}</p>}
    </>
  );
}
