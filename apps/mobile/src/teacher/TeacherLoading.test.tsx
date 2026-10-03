import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { MyPayoutsScreen } from './MyPayoutsScreen';
import { TeacherReportsScreen } from './TeacherReportsScreen';
import { TeacherScheduleScreen } from './TeacherScheduleScreen';
import { TeacherTodayScreen } from './TeacherTodayScreen';

// A request that never answers: the screen is "loading", and says so instead of showing a blank body.
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: () => new Promise(() => undefined) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

test.each([
  ['Today', <TeacherTodayScreen key="a" />],
  ['Schedule', <TeacherScheduleScreen key="b" />],
  ['Reports', <TeacherReportsScreen key="c" />],
  ['Payouts', <MyPayoutsScreen key="d" />],
])('%s: «جاري التحميل» while the first answer is on its way', async (_name, screenElement) => {
  await renderWithQuery(screenElement);
  expect(screen.getAllByText(t.common.loading).length).toBeGreaterThan(0);
});
