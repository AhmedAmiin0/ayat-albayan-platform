import type { RoomPresence } from '@ab/schedule';
import { PUBLIC_CONFIG_QUERY_KEY, PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '@/portal/portal.fixtures';
import { NextLessonCard } from './NextLessonCard';

jest.mock('@ab/mobile-kit/room', () => ({
  ...jest.requireActual('@ab/mobile-kit/room'),
  liveKitNative: () => ({}),
}));

// The lapis card (canvas Child) and its live state (owner 2026-11-16, canvas RoomXLiveHome).

const MIN = 60_000;
const L = t.portal.app.live;
const show = (l: ReturnType<typeof lesson>) =>
  renderWithQuery(<NextLessonCard lesson={l} student={student()} full />, freshQueryClient());

/** A lesson that started 4 minutes ago, its room live since then. */
function liveLesson(inRoom: RoomPresence[] = [{ name: 'فاطمة', role: 'teacher' }]) {
  const now = new Date();
  const liveSince = new Date(now.getTime() - 4 * MIN).toISOString();
  const opens = new Date(now.getTime() - 15 * MIN).toISOString();
  const closes = new Date(now.getTime() + 60 * MIN).toISOString();
  const window = { state: 'open' as const, opens_at: opens, closes_at: closes };
  return lesson(now, -4, { window, room: { liveSince, endedAt: null, inRoom } });
}

test('the room note over the lapis fill reads at 0.92 (4.5:1; 0.85 was 4.43:1)', async () => {
  await show(lesson(new Date(), 30));
  const note = screen.getByText(t.portal.app.lesson.roomNote);
  expect(StyleSheet.flatten(note.props.style).opacity).toBe(0.92);
});

test('live: «الحلقة جارية الآن», how long, the teacher inside, «ادخل الآن»', async () => {
  await show(liveLesson([{ name: 'فاطمة', role: 'teacher' }, { name: 'مريم', role: 'staff' }]));
  expect(screen.getByText(t.portal.now)).toBeTruthy();
  expect(screen.getByText(L.since.few.replace('{n}', '4'))).toBeTruthy();
  expect(screen.getByText(L.teacherIn)).toBeTruthy();
  expect(screen.getByText(`فاطمة · ${L.roles.staff.replace('{name}', 'مريم')}`)).toBeTruthy();
  expect(screen.getByRole('button', { name: L.join })).toBeTruthy();
  expect(screen.queryByText(t.portal.app.lesson.openNow)).toBeNull();
});

test('only the student inside: «في الغرفة الآن», not the teacher line', async () => {
  await show(liveLesson([{ name: 'سارة', role: 'student' }]));
  expect(screen.getByText(L.othersIn)).toBeTruthy();
  expect(screen.queryByText(L.teacherIn)).toBeNull();
});

test('not live (nobody inside): the countdown card as before', async () => {
  await show(lesson(new Date(), 30));
  expect(screen.queryByText(L.teacherIn)).toBeNull();
  expect(screen.getByRole('timer')).toBeTruthy();
});

test('live with the room in the app: «تدخل الغرفة مباشرةً…» instead of the browser note', async () => {
  const client = freshQueryClient();
  const config = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, family_meetings_in_app: true };
  client.setQueryData(PUBLIC_CONFIG_QUERY_KEY, config);
  await renderWithQuery(<NextLessonCard lesson={liveLesson()} student={student()} full />, client);
  expect(screen.getByText(t.portal.app.lesson.roomNoteLive)).toBeTruthy();
  expect(screen.queryByText(t.portal.app.lesson.roomNote)).toBeNull();
  expect(screen.getByRole('header', { name: t.portal.now })).toBeTruthy();
});

test('a person the portal names by role only: the role word, and their face too', async () => {
  await show(liveLesson([{ name: 'فاطمة', role: 'teacher' }, { role: 'guest' }]));
  expect(screen.getByText(`فاطمة · ${L.unnamed.guest}`)).toBeTruthy();
  expect(screen.getAllByTestId('avatar-initials', { includeHiddenElements: true })).toHaveLength(2);
});
