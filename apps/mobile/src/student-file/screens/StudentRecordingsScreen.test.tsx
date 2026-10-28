import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
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

test('rows: count, teacher, duration, size, status chips; a deleted row has no play', async () => {
  serve();
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('header', { name: `${R.title} · 2` })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1/recordings?page=1&pageSize=10');
  expect(screen.getByText(`${R.teacher}: أبرار`)).toBeTruthy();
  expect(screen.getByText(`${R.duration}: 30:00`)).toBeTruthy();
  expect(screen.getByText(`${R.size}: ${R.sizeMb.replace('{n}', '48')}`)).toBeTruthy();
  expect(screen.getByText(R.status.done)).toBeTruthy();
  expect(screen.getByText(R.status.deleted)).toBeTruthy();
  expect(screen.getAllByText(R.play)).toHaveLength(1);
});

test('play refetches for a fresh signed link and opens it in the system player', async () => {
  serve();
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(R.status.done);
  mockApiFetch.mockClear();
  serve([recording({ url: 'https://files.test/fresh.mp3?t=2' })]);
  await fireEvent.press(screen.getByText(R.play));
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://files.test/fresh.mp3?t=2'));
  expect(recordingCalls()).toEqual(['/students/s1/recordings?page=1&pageSize=10']);
});

test('the switch PATCHes the visibility; a 409 group lesson shows its message', async () => {
  serve([recording()]);
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  const toggle = await screen.findByRole('switch', { name: R.visible.label });
  await fireEvent(toggle, 'valueChange', true);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/recordings/r1/visibility', { visible: true }));
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'recording_group_lesson' }));
  await fireEvent(toggle, 'valueChange', true);
  expect(await screen.findByText(R.visible.groupLesson)).toBeTruthy();
});

test('delete asks first, then DELETEs; a 409 says it is still recording', async () => {
  serve([recording()]);
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByText(R.delete.action));
  expect(screen.getByText(R.delete.question)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  mockApiSend.mockRejectedValueOnce(new ApiError(409));
  await fireEvent.press(screen.getByText(R.delete.confirm));
  expect(await screen.findByText(R.delete.inProgress)).toBeTruthy();
  await fireEvent.press(screen.getByText(R.delete.confirm));
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('DELETE', '/recordings/r1'));
});

test('date and teacher pills filter on the server', async () => {
  serve();
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(R.status.done);
  await fireEvent.press(await screen.findByRole('tab', { name: 'منى' }));
  await waitFor(() => expect(recordingCalls().some((p) => p.includes('teacherId=t2'))).toBe(true));
  await fireEvent.press(screen.getByRole('tab', { name: R.filters.last7 }));
  await waitFor(() => expect(recordingCalls().some((p) => p.includes('from=') && p.includes('to=') && p.includes('teacherId=t2'))).toBe(true));
});

test('without recordings.manage there is no delete and the switch is read-only', async () => {
  permissions = ['recordings.read'];
  serve([recording()]);
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  await screen.findByText(R.status.done);
  await waitFor(() => expect(screen.queryByText(R.delete.action)).toBeNull());
  expect(screen.getByRole('switch', { name: R.visible.label }).props.accessibilityState?.disabled ?? screen.getByRole('switch').props.disabled).toBeTruthy();
});

test('teacher mode never shows delete; an empty list and an error have their states', async () => {
  serve([]);
  const view = await renderWithQuery(<StudentRecordingsScreen admin={false} />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(R.empty)).toBeTruthy();
  view.unmount();
  mockApiFetch.mockReset().mockImplementation(async (p: string) => {
    if (p === '/auth/me') return { permissions };
    throw new ApiError(500);
  });
  await renderWithQuery(<StudentRecordingsScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByText(R.error, undefined, { timeout: 3000 })).toBeTruthy();
});
