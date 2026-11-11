import { screen, fireEvent } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TeacherReportsScreen } from './TeacherReportsScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const kid = (id: string, name: string, status: string) => ({
  id,
  code: `AB-0${id}`,
  name,
  tz: 'Asia/Riyadh',
  status,
});
const me = {
  id: 't-abrar',
  display_name_ar: 'أبرار',
  tz: 'Africa/Cairo',
  students: [
    kid('101', 'يوسف', 'active'),
    kid('102', 'بلال', 'trial'),
    kid('103', 'مريم', 'paused'),
    kid('104', 'زيد', 'churned'),
    kid('105', 'سلمى', 'expired'),
  ],
};

const answer = (p: string) => {
  const lists: Record<string, unknown> = { '/teachers/me': me, '/teachers/me/pending-reports': [] };
  return lists[p] ?? { items: [], total: 0, page: 1, pageSize: 25 };
};

beforeEach(() => {
  mockApiFetch.mockImplementation(async (p: string) => answer(p));
});

test('«طلابي»: only her current students (docs/46 D4), trial and subscribed together, never paused or churned', async () => {
  await renderWithQuery(<TeacherReportsScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: t.teacherDash.myStudents }));
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(screen.getByText('بلال')).toBeTruthy();
  expect(screen.getByText('سلمى')).toBeTruthy();
  expect(screen.queryByText('مريم')).toBeNull();
  expect(screen.queryByText('زيد')).toBeNull();
});
