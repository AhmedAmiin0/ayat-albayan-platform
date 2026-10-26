import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { pending } from '@/today/testing/fixtures';
import { TeacherCalendarScreen } from './TeacherCalendarScreen';

jest.setTimeout(120_000);

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 't1' }) }));

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/teachers/t1') return { id: 't1', display_name_ar: 'أبرار', phone_e164: null, status: 'active', tz: 'Africa/Cairo' };
    if (path === '/teachers/t1/availability') return [];
    if (path.startsWith('/lessons')) return [{ ...pending, time_edit_mode: 'edit' }];
    throw new ApiError(404);
  });
  fakeNow(new Date('2026-10-01T13:20:00Z'));
});
afterEach(() => jest.useRealTimers());

test('admin on a teacher’s calendar: a tap opens the details with the row’s «عدّل الوقت» and «غيّر الميعاد»', async () => {
  await renderWithQuery(<TeacherCalendarScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد') }));
  expect(screen.getByText(t.lessons.sheet.about)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: new RegExp(`^${t.editTime.action}`) })).toHaveLength(2);
});
