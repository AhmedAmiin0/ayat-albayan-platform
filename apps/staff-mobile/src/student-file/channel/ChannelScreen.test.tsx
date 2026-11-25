import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { TeacherChannelScreen } from './ChannelScreen';
import { SalesChannelScreen } from './SalesChannelScreen';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ studentId: 's1', id: 's1' }),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
  apiSend: jest.fn(async () => ({})),
}));

const c = t.studentChannel;
const page = {
  ...{ student_name: 'سلمى', messages: [], has_more: false, read_only: false, open: true },
  ...{ closed_reason: null, channel_id: '' },
};
/** The assistant holds the chat's seat (one assistant at a time). */
const mine = { holder: { id: 'p-a', name: 'سارة' }, mine: true, bringer: false, canTake: false };
const ANSWERS: readonly (readonly [string, unknown])[] = [
  ['/presence', { enabled: false, peers: [] }],
  ['/seat', mine],
];
const answer = (path: string) => ANSWERS.find(([end]) => path.endsWith(end))?.[1] ?? page;

beforeEach(() => {
  mockFetch
    .mockReset()
    .mockImplementation(async (path: string) => answer(path));
});

test('the teacher’s chat: the student’s name, attach and the microphone (the staff port)', async () => {
  await renderWithQuery(<TeacherChannelScreen />, freshQueryClient());
  expect(await screen.findByRole('header', { name: 'سلمى' })).toBeTruthy();
  expect(screen.getByLabelText(c.media.attach)).toBeTruthy();
  expect(screen.getByLabelText(c.media.record)).toBeTruthy();
  expect(mockFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/messages');
});

test('the seated assistant’s chat: whose chat before the student, «مغادرة», attach', async () => {
  await renderWithQuery(<SalesChannelScreen />, freshQueryClient());
  expect(await screen.findByText(`${c.monitorTitle} · سلمى`)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.seat.leave })).toBeTruthy();
  expect(screen.getByLabelText(c.media.attach)).toBeTruthy();
});
