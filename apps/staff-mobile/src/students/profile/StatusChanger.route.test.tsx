import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { StudentScreen } from '@/students/screens/StudentScreen';
import { stopPreview } from '@/students/course-actions/fixtures';
import { historyOf } from '@/trial-date/testing/fixtures';
import { profile } from '@/students/shared/test-data';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

// owner 2026-11-17: «موقوف مؤقتًا» / «متوقف» go through the pause / the stop, never a bare PATCH.
const serve = async (p: string) => {
  if (p.includes('/trial-dates')) return historyOf([]);
  if (p === '/students/s1') return profile;
  if (p.startsWith('/students/s1/course-stop')) return stopPreview();
  if (p === '/students/s1/course-pause') return { open: null, history: [] };
  if (p.startsWith('/students/s1/course-pause/preview')) return { from_date: '2026-11-17', until_date: null, lessons: 0 };
  throw new ApiError(404);
};
const pill = (name: string) => screen.getByRole('radio', { name });

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(serve);
  mockApiSend.mockReset();
});

test('«موقوف مؤقتًا» opens «إيقاف الدورة مؤقتًا»; nothing is PATCHed', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  expect(screen.getByText(t.courseCard.statusNote)).toBeTruthy();
  await fireEvent.press(pill(t.enums.studentStatus.paused));
  expect(await screen.findByRole('header', { name: t.coursePause.title })).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«متوقف» with a package opens «إلغاء الاشتراك» with its danger confirm', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(await screen.findByRole('header', { name: t.courseActions.stop.title })).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.courseActions.stop.confirm })).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«متوقف» with no package (404): set at once; a failed read sets nothing and says so', async () => {
  mockApiSend.mockResolvedValue({});
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p.startsWith('/students/s1/course-stop')) throw new ApiError(404);
    return serve(p);
  });
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalled());
  expect(screen.queryByRole('header', { name: t.courseActions.stop.title })).toBeNull();
});

test('«متوقف» while the package cannot be read: no PATCH, no sheet, the error', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p.startsWith('/students/s1/course-stop')) throw new ApiError(500);
    return serve(p);
  });
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});
