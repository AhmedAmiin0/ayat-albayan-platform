import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { RecordingsList } from './RecordingsList';
import { recordingTime } from './recording-format';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const R = t.classroom.recordings;
const lessonSource = { kind: 'lesson', id: 'l-1' } as const;
const done = { id: 'r1', status: 'done', started_at: '2026-10-01T13:00:00.000Z', ended_at: null, url: 'https://signed/1' };
const live = { id: 'r2', status: 'recording', started_at: '2026-10-01T14:00:00.000Z', ended_at: null, url: null };
const failed = { id: 'r3', status: 'failed', started_at: '2026-10-01T15:00:00.000Z', ended_at: null, url: null };
let openURL: jest.SpyInstance;

function serve(list: unknown[], configured = true) {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/recordings/status' ? { configured } : list));
}

beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});

test('each recording shows its time and status chip; only a finished one has «شغّل»', async () => {
  serve([done, live, failed]);
  await renderWithQuery(<RecordingsList source={lessonSource} />);
  expect(await screen.findByText(R.status.done)).toBeTruthy();
  expect(screen.getByText(R.status.recording)).toBeTruthy();
  expect(screen.getByText(R.status.failed)).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^شغّل|^Play/ })).toHaveLength(1);
  expect(mockApiFetch).toHaveBeenCalledWith('/lessons/l-1/recordings');
});


test('a tap refetches the list and opens the FRESH signed url; the list is never persisted', async () => {
  serve([done]);
  const { client } = await renderWithQuery(<RecordingsList source={lessonSource} />);
  const play = await screen.findByRole('button', { name: t.mobileClassroom.playOf.replace('{time}', recordingTime(done.started_at)) });
  serve([{ ...done, url: 'https://signed/2' }]);
  await fireEvent.press(play);
  await waitFor(() => expect(openURL).toHaveBeenCalledWith('https://signed/2'));
  expect(client.getQueryCache().find({ queryKey: ['lessons', 'l-1', 'recordings'] })?.meta).toEqual({ noPersist: true });
});

test('a link that is gone by the tap says so and opens nothing', async () => {
  serve([done]);
  await renderWithQuery(<RecordingsList source={lessonSource} />);
  const play = await screen.findByRole('button', { name: /./, busy: false });
  serve([{ ...done, url: null }]);
  await fireEvent.press(play);
  expect(await screen.findByText(t.mobileClassroom.playFailed)).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
});

test('empty lesson and empty meeting have their own words; a server that cannot record warns', async () => {
  serve([], false);
  const first = await renderWithQuery(<RecordingsList source={lessonSource} />);
  expect(await screen.findByText(R.empty)).toBeTruthy();
  expect(await screen.findByText(new RegExp(R.notConfigured))).toBeTruthy();
  await first.unmount();
  await renderWithQuery(<RecordingsList source={{ kind: 'meeting', id: 'm-1' }} />);
  expect(await screen.findByText(R.emptyMeeting)).toBeTruthy();
});

test('a failed read shows the error with retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<RecordingsList source={lessonSource} />);
  expect(await screen.findByText(R.error)).toBeTruthy();
  serve([done]);
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText(R.status.done)).toBeTruthy();
});
