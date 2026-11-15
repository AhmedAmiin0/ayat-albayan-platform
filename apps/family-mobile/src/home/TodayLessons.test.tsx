import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { lesson, student } from '@/portal/portal.fixtures';
import { TodayLessons } from './TodayLessons';

const mockFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const reads = (lessons: unknown[]) => ({
  lessons,
  prepare: null,
  month: { attended: 0, absent: 0 },
});
const show = () => renderWithQuery(<TodayLessons students={[student()]} />, freshQueryClient());

beforeEach(() => jest.clearAllMocks());

test("a lesson running now: today's header, the child's name and «ادخل»", async () => {
  mockFetch.mockResolvedValue(reads([lesson(new Date(), -1)]));
  await show();
  expect(await screen.findByText(/^سارة · /)).toBeTruthy();
  expect(screen.getByText(/^اليوم · /)).toBeTruthy();
});

test('nothing left today: the note', async () => {
  mockFetch.mockResolvedValue(reads([]));
  await show();
  expect(await screen.findByText(t.portal.app.home.noToday)).toBeTruthy();
});
