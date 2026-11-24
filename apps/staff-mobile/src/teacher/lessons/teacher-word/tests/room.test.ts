import type { LessonRoomState } from '@ab/schedule';
import { t } from '@ab/mobile-kit';
import { lesson } from '@/today/testing/fixtures';
import { teacherWord, waiting } from '@/teacher/lessons/teacher-word/teacher-word';

// 16:00–16:45 Riyadh on 1 Oct 2026 (13:00Z); the student came in at 12:57Z.
const now = new Date('2026-10-01T13:00:00Z');
const room = (over: Partial<LessonRoomState>): LessonRoomState => ({
  liveSince: '2026-10-01T12:57:00Z',
  endedAt: null,
  inRoom: [{ name: 'يوسف', role: 'student' }],
  ...over,
});

test('the student inside without her: «الطالب ينتظرك», and who waits since when', () => {
  const l = { ...lesson({ id: 'l' }), room: room({}) };
  expect(teacherWord(l, now)).toEqual({
    label: t.teacherToday.waiting,
    tone: 'act',
    glyph: 'fill',
  });
  expect(waiting(l, now)).toEqual({
    name: 'يوسف',
    line: t.teacherToday.waitingLine.replace('{name}', 'يوسف'),
    since: t.teacherToday.waitingSince.replace(
      '{age}',
      t.mobile.age.minutes.few.replace('{n}', '3'),
    ),
  });
});

test('she is in: «الحلقة جارية الآن», no waiting line', () => {
  const inRoom = [
    { name: 'فاطمة', role: 'teacher' as const },
    { name: 'يوسف', role: 'student' as const },
  ];
  const l = { ...lesson({ id: 'l' }), room: room({ inRoom }) };
  expect(teacherWord(l, now)?.label).toBe(t.teacherToday.liveNow);
  expect(waiting(l, now)).toBeNull();
});

test('nobody inside, ended for everyone or no `room` (an older API): the lesson’s own word', () => {
  const base = lesson({ id: 'l' });
  const own = teacherWord(base, now);
  expect(teacherWord({ ...base, room: room({ inRoom: [], liveSince: null }) }, now)).toEqual(own);
  expect(teacherWord({ ...base, room: room({ endedAt: '2026-10-01T13:00:00Z' }) }, now)).toEqual(
    own,
  );
  expect(waiting({ ...base, room: null }, now)).toBeNull();
});
