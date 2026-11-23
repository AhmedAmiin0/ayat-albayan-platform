import { lessonMinutes } from '@ab/client-core';
import { firstName, type PortalLesson, type PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, FormAlert, ButtonRow, Drawer } from '#/components/ui/index.ts';
import {
  MoveReason,
  bookableWindow,
  currentWeekStart,
  openingWeek,
  WeekSlotsFrame,
} from '#/schedule/index.ts';
import { t, teacherLabel } from '#/lib/i18n/index.ts';
import { useViewerTz } from '#/lib/index.ts';
import { familySlotsQuery } from '#/portal/api.ts';
import { LessonWhen } from '#/portal/lessons/LessonWhen.tsx';

interface AskTimeDrawerProps {
  lesson: PortalLesson;
  student: PortalStudent;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (ask: { startsAt: string; note: string }) => void;
}

const A = t.portal.actions;

/** «حلقة يوسف مع أ. فاطمة · 45 دقيقة». */
const sublineOf = (lesson: PortalLesson, student: PortalStudent): string =>
  A.askSubline
    .replace('{student}', firstName(student.name))
    .replace('{teacher}', teacherLabel(lesson.teacher))
    .replace('{minutes}', t.portal.app.lesson.minutes.replace('{n}', String(lessonMinutes(lesson))));

/**
 * «اطلب موعدًا آخر» (canvas LessonXWebFamily): the staff slot grid's week frame over the family's
 * free starts, a note for the academy and «أرسل الطلب». The lesson keeps its time until answered.
 */
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
