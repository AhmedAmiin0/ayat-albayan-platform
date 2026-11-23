import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '#/portal/portal.fixtures.ts';
import { ScheduleRow } from './ScheduleRow';

// A week row's live line (owner 2026-11-16, canvas RoomXLivePush).

const now = new Date('2026-11-16T15:34:00.000Z');
const clock = { tz: 'Asia/Riyadh', cycle: '12' as const, locale: 'ar' as const };
const room = (inRoom: { name: string; role: 'teacher' | 'student' }[]) => ({
  liveSince: '2026-11-16T15:30:00.000Z',
  endedAt: null,
  inRoom,
});
const show = (over: Parameters<typeof lesson>[2]) => {
  const entry = { student: student(), lesson: lesson(now, -4, over) };
  return renderWithQuery(<ScheduleRow entry={entry} clock={clock} now={now} />, freshQueryClient());
};

test('the teacher inside: «جارية الآن · المعلم/ة في الغرفة»', async () => {
  await show({ room: room([{ name: 'فاطمة', role: 'teacher' }]) });
  expect(screen.getByText(t.portal.app.live.rowTeacher)).toBeTruthy();
});

test('only the student inside: «جارية الآن»; nobody: no live line', async () => {
  await show({ room: room([{ name: 'سارة', role: 'student' }]) });
  expect(screen.getByText(t.portal.app.live.row)).toBeTruthy();
  await show({ room: null });
  expect(screen.queryByText(t.portal.app.live.row)).toBeNull();
});
