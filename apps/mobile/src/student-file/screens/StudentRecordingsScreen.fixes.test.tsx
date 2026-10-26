import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { recording, recordingsPage } from '../testing/fixtures';
import { StudentRecordingsScreen } from './StudentRecordingsScreen';

const R = t.mobileStudentFile.recordings;
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

let permissions: string[] = ['recordings.read', 'recordings.manage'];
function serve(items = [recording(), recording({ id: 'r2', status: 'deleted', url: null, teacher: null, duration_seconds: null, size_bytes: null })]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions };
    if (path === '/students/s1') return { name: 'هدى' };
    if (path === '/students/teacher-options') return [{ id: 't1', display_name_ar: 'أبرار' }, { id: 't2', display_name_ar: 'منى' }];
    if (path.startsWith('/students/s1/recordings')) return recordingsPage(items);
    throw new ApiError(404);
  });
}
const recordingCalls = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.includes('/recordings'));

let openURL: jest.SpyInstance;
beforeEach(() => {
  permissions = ['recordings.read', 'recordings.manage'];
  mockApiFetch.mockReset();
  mockApiSend.mockReset().mockResolvedValue(undefined);
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => openURL.mockRestore());

test('a failed link load says so instead of opening the old signed link', async () => {
  serve();
  await renderWithQuery(<StudentRecordingsScreen />);
  await screen.findByText(R.status.done);
  mockApiFetch.mockReset().mockRejectedValue(new ApiError(500));
  await fireEvent.press(screen.getByText(R.play));
  expect(await screen.findByText(R.playFailed)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('no delete on a row the viewer cannot manage', async () => {
  serve([recording({ can_manage: false })]);
  await renderWithQuery(<StudentRecordingsScreen />);
  await screen.findByText(R.status.done);
  expect(screen.queryByText(R.delete.action)).toBeNull();
});

test('a teacher can clear the teacher filter after picking one', async () => {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/auth/me') return { permissions };
    if (path === '/teachers/me') return { tz: 'Africa/Cairo', students: [{ id: 's1', name: 'هدى' }] };
    const t2 = recording({ id: 'r2', teacher: { id: 't2', display_name_ar: 'منى', display_name_en: null } });
    if (path.includes('teacherId=t2')) return recordingsPage([t2]);
    if (path.startsWith('/students/s1/recordings')) return recordingsPage([recording(), t2]);
    throw new ApiError(404);
  });
  await renderWithQuery(<StudentRecordingsScreen admin={false} />);
  await fireEvent.press(await screen.findByRole('tab', { name: 'منى' }));
  await waitFor(() => expect(recordingCalls().some((p) => p.includes('teacherId=t2'))).toBe(true));
  await fireEvent.press(await screen.findByRole('tab', { name: R.filters.teacherAll }));
  await waitFor(() => expect(screen.getByRole('tab', { name: 'أبرار' })).toBeTruthy());
});

test('a play that cannot get a link says so', async () => {
  serve();
  await renderWithQuery(<StudentRecordingsScreen />);
  await screen.findByText(R.status.done);
  serve([recording({ url: null })]);
  await fireEvent.press(screen.getByText(R.play));
  expect(await screen.findByText(R.playFailed)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

