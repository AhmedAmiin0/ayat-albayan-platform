import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { saturday } from './testing/day-fixtures';
import { TeacherDayEnd } from './TeacherDayEnd';

const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ router: { navigate: (h: string) => mockNavigate(h) } }));

beforeEach(() => jest.clearAllMocks());

test('no lessons today: the title, her next lesson with its names, and «افتح جدولي»', async () => {
  await renderWithQuery(<TeacherDayEnd kind="empty" next={saturday} />);
  expect(screen.getByText(t.teacherDash.noLessonsToday)).toBeTruthy();
  expect(screen.getByText(/ريم سالم$/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.teacherToday.openSchedule }));
  expect(mockNavigate).toHaveBeenCalledWith('/teacher/schedule');
});

test('all ended, nothing in two weeks: «انتهت حلقات اليوم» and noneSoon', async () => {
  await renderWithQuery(<TeacherDayEnd kind="done" next={null} />);
  expect(screen.getByText(t.today.quietTitle)).toBeTruthy();
  expect(screen.getByText(t.teacherToday.noneSoon)).toBeTruthy();
});

test('something still ahead: nothing', async () => {
  await renderWithQuery(<TeacherDayEnd kind={null} next={saturday} />);
  expect(screen.queryByTestId('teacher-day-end')).toBeNull();
});
