import { minutesLeft, teacherLessonState, type TeacherLessonState } from '@ab/client-core';
import { counted, type Glyph, type LessonView, type Tone } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The teacher's own word for a lesson (docs/48 «State word lookup»): one per state, the same on
// the «اليوم» rows, the hero chip and «جدولي». Each chip shows the nuqta AND the word (docs/07).

interface TeacherWord {
  label: string;
  tone: Tone;
  glyph: Glyph;
}

type WordLesson = Parameters<typeof teacherLessonState>[0] & Pick<LessonView, 'students'>;
/** `status` and `done` leave the word to the lesson-status chip. */
type Worded = Exclude<TeacherLessonState, 'status' | 'done'>;

/** A window not yet closed: a group's closed ones must not count down to the past. */
const stillOpen = (now: Date) => (iso: string) => Date.parse(iso) > now.getTime();

/** The soonest family send among the lesson's submitted reports still in their edit window. */
const soonestClose = (lesson: WordLesson, now: Date): string | undefined =>
  lesson.students
    .flatMap((s) => (s.report?.edit_until ? [s.report.edit_until] : []))
    .filter(stillOpen(now))
    .sort()
    .at(0);

/** «سيُرسل إلى الأسرة بعد 12 دقيقة», counted to edit_until (docs/46 B5). */
const sendsIn = (lesson: WordLesson, now: Date): string =>
  t.reports.familySend.sendsIn.replace(
    '{when}',
    counted(t.settingsValues.units.minutes, minutesLeft(soonestClose(lesson, now), now)),
  );

const WORDS: Record<Worded, (lesson: WordLesson, now: Date) => TeacherWord> = {
  awaiting: () => ({ label: t.teacherToday.awaiting, tone: 'act', glyph: 'hollow' }),
  confirmed: () => ({ label: t.teacherBoard.confirmedChip, tone: 'ok', glyph: 'fill' }),
  running: () => ({ label: t.today.running, tone: 'ok', glyph: 'fill' }),
  write: () => ({ label: t.reports.open, tone: 'act', glyph: 'hollow' }),
  resume: () => ({ label: t.reports.resume, tone: 'act', glyph: 'half' }),
  window: (lesson, now) => ({ label: sendsIn(lesson, now), tone: 'neutral', glyph: 'half' }),
};

const isWorded = (state: TeacherLessonState): state is Worded =>
  state !== 'status' && state !== 'done';

/** Her word for the lesson now, or null: then the lesson-status chip speaks (held, excused…). */
export function teacherWord(lesson: WordLesson, now: Date): TeacherWord | null {
  const state = teacherLessonState(lesson, now);
  return isWorded(state) ? WORDS[state](lesson, now) : null;
}
