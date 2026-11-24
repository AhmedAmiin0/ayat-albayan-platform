import { lessonWhenAt } from '@ab/shared';
import type { StudentLinkLesson } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { classroomErrorText, opensAtOf } from '@ab/web-kit/classroom/room/livekit/errors';
import { isLessonNow, windowStateAt } from '@ab/client-core';
import { RecordedNotice } from '@ab/web-kit/classroom/recordings/RecordedNotice';
import { opensAtText } from '@ab/web-kit/classroom/room/livekit/window-hint';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

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

export function StudentLessonPanel({ lesson, firstName, now, pending, error, onJoin }: Props) {
  const clock = useClock();
  const tz = useViewerTz();
  const [name, setName] = useState('');
  const state = windowStateAt(lesson.window, now);
  const title = isLessonNow(lesson, now) ? t.studentLink.page.now : t.studentLink.page.next;
  const waiting = state === 'early' ? opensAtText(lesson.window.opens_at, clock.cycle) : t.classroom.closedHint;
  return (
    <>
      <section aria-label={title} className="grid gap-1">
        <h2 className="font-display text-h3 font-bold">{title}</h2>
        <p className="text-body">{lessonWhenAt(new Date(lesson.starts_at), { tz, ...clock })}</p>
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
