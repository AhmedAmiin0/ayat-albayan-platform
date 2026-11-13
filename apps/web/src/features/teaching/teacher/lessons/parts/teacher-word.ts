import {
  minutesLeft,
  reportSendState,
  teacherLessonState,
  type TeacherLessonState,
} from '@ab/client-core';
import { counted, type LessonView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { LessonStatusChip } from '@/lib/settings/lesson-status-text';

// docs/48 «State word lookup»: the teacher's own word for a lesson, on every row, chip and hero.
// Each word is a nuqta glyph AND the ar.json word (docs/07: never colour alone).

interface WordAt {
  now: Date;
  /** The lesson-status chip (excused, late, no_show, completed …): the fallback word. */
  status: LessonStatusChip;
}

type Word = (lesson: LessonView, at: WordAt) => LessonStatusChip;

const fixed =
  (word: Omit<LessonStatusChip, 'label'>, label: string): Word =>
  () => ({ ...word, label });

const ACT = { tone: 'act', glyph: 'half' } as const;
const OK = { tone: 'ok', glyph: 'fill' } as const;

/** Minutes until the first report still in its edit window goes to the family. */
const windowMinutes = (lesson: LessonView, now: Date): number => {
  const inWindow = lesson.students
    .map((s) => s.report)
    .find((r) => r !== null && r !== undefined && reportSendState(r, now) === 'window');
  return minutesLeft(inWindow?.edit_until, now);
};

const sendsIn: Word = (lesson, at) => ({
  tone: 'neutral',
  glyph: 'hollow',
  label: t.reports.familySend.sendsIn.replace(
    '{when}',
    counted(t.settingsValues.units.minutes, windowMinutes(lesson, at.now)),
  ),
});

const statusWord: Word = (_lesson, at) => at.status;

const TEACHER_WORD: Record<TeacherLessonState, Word> = {
  awaiting: fixed(ACT, t.teacherDash.awaiting),
  confirmed: fixed(OK, t.teacherBoard.confirmedChip),
  running: fixed(OK, t.today.running),
  write: fixed(ACT, t.reports.open),
  resume: fixed(ACT, t.reports.resume),
  window: sendsIn,
  done: statusWord,
  status: statusWord,
};

/** The chip of one lesson for the teacher, now (teacherLessonState through TEACHER_WORD). */
export function teacherWord(lesson: LessonView, at: WordAt): LessonStatusChip {
  return TEACHER_WORD[teacherLessonState(lesson, at.now)](lesson, at);
}
