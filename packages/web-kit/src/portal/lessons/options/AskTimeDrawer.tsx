import { lessonMinutes } from '@ab/client-core';
import { firstName, type PortalLesson, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { ButtonRow } from '@ab/web-kit/components/ui/layout/button-row';
import { Drawer } from '@ab/web-kit/components/ui/overlay/Drawer';
import { MoveReason } from '@ab/web-kit/schedule/MoveReason';
import { bookableWindow, currentWeekStart, openingWeek } from '@ab/web-kit/schedule/slots';
import { WeekSlotsFrame } from '@ab/web-kit/schedule/WeekSlotsFrame';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { familySlotsQuery } from '@ab/web-kit/portal/api';
import { LessonWhen } from '@ab/web-kit/portal/lessons/LessonWhen';

interface AskTimeDrawerProps {
  lesson: PortalLesson;
  student: PortalStudent;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (ask: { startsAt: string; note: string }) => void;
}

const A = t.portal.actions;

const sublineOf = (lesson: PortalLesson, student: PortalStudent): string =>
  A.askSubline
    .replace('{student}', firstName(student.name))
    .replace('{teacher}', teacherLabel(lesson.teacher))
    .replace('{minutes}', t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson))));

/** The lesson keeps its time until the request is answered. */
export function AskTimeDrawer(props: AskTimeDrawerProps) {
  const { lesson, student, busy, error, onClose, onSend } = props;
  const tz = useViewerTz();
  const [now] = useState(() => new Date());
  const first = currentWeekStart(now, tz);
  const [week, setWeek] = useState(() => openingWeek(lesson.starts_at, { first, tz }));
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const range = bookableWindow(week, now, tz) ?? { from: now, to: now };
  const ids = { studentId: student.id, lessonId: lesson.id };
  const window = { from: range.from.toISOString(), to: range.to.toISOString() };
  const slots = useQuery(familySlotsQuery({ ...ids, ...window }));
  const free = slots.data?.slots.map((s) => ({ ...s, conflicts: [] }));
  return (
    <Drawer title={A.request} onClose={onClose}>
      <div className="grid gap-4 p-4">
        <div className="grid gap-1">
          <p className="font-semibold">{sublineOf(lesson, student)}</p>
          <LessonWhen startsAt={lesson.starts_at} tz={student.tz} />
        </div>
        <WeekSlotsFrame
          week={week}
          first={first}
          onWeek={setWeek}
          studentTz={student.tz}
          read={{ data: free, isError: slots.isError }}
          grid={{ value: startsAt, onPick: (slot) => setStartsAt(slot.starts_at) }}
        />
        <MoveReason value={note} onChange={setNote} label={A.noteLabel} hint={A.staysNote} />
        {error && <FormAlert>{error}</FormAlert>}
        <ButtonRow>
          <Button
            type="button"
            disabled={busy || startsAt === null}
            onClick={() => startsAt && onSend({ startsAt, note: note.trim() })}
          >
            {A.send}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </ButtonRow>
      </div>
    </Drawer>
  );
}
