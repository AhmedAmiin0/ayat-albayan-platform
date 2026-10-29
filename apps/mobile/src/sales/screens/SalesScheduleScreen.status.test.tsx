import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from './SalesScheduleScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

const s = t.sales.academySchedule.status;
const one = (id: string, name: string, status: Parameters<typeof scheduleLesson>[0]['status']) =>
  scheduleLesson({ id, status, students: [{ id: `s-${id}`, code: 'AB-0300', name }] });
const LESSONS = [
  one('a', 'سلمى', 'scheduled'),
  one('b', 'هند', 'scheduled'),
  one('c', 'مريم', 'confirmed'),
  one('d', 'نور', 'cancelled_by_admin'),
];

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => (path === '/sales/teachers' ? [teacher()] : { date: '2026-10-12', lessons: LESSONS }));
  fakeNow(new Date('2026-10-12T10:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

const pills = () => within(screen.getByLabelText(s.label));

test('the status pills carry the day\'s counts; «الكل» is chosen first and shows every lesson', async () => {
  await renderWithQuery(<SalesScheduleScreen />);
  expect(await screen.findByText('نور')).toBeTruthy();
  expect(pills().getByRole('tab', { name: `${s.all} 4` }).props.accessibilityState).toMatchObject({ selected: true });
  expect(pills().getByRole('tab', { name: `${s.scheduled} 2` })).toBeTruthy();
  expect(pills().getByRole('tab', { name: `${s.confirmed} 1` })).toBeTruthy();
  expect(pills().getByRole('tab', { name: `${s.cancelled} 1` })).toBeTruthy();
});

test('«يحتاج تأكيد» keeps only the unconfirmed lessons, «ملغاة» the cancelled; «الكل» brings all back', async () => {
  await renderWithQuery(<SalesScheduleScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: `${s.scheduled} 2` }));
  expect(screen.getByText('سلمى')).toBeTruthy();
  expect(screen.getByText('هند')).toBeTruthy();
  expect(screen.queryByText('مريم')).toBeNull();
  expect(screen.queryByText('نور')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: `${s.cancelled} 1` }));
  expect(screen.getByText('نور')).toBeTruthy();
  expect(screen.queryByText('سلمى')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: `${s.all} 4` }));
  expect(screen.getByText('مريم')).toBeTruthy();
});

test('a pill with no lessons says so, not that the day is empty', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/sales/teachers' ? [teacher()] : { date: '2026-10-12', lessons: [one('a', 'سلمى', 'scheduled')] }));
  await renderWithQuery(<SalesScheduleScreen />);
  await fireEvent.press(await screen.findByRole('tab', { name: `${s.confirmed} 0` }));
  expect(screen.getByText(s.empty)).toBeTruthy();
  expect(screen.queryByText(t.sales.academySchedule.empty)).toBeNull();
});
