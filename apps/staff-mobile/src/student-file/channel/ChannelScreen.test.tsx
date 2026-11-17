import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { SalesChannelScreen, TeacherChannelScreen } from './ChannelScreen';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({ studentId: 's1' }),
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

beforeEach(() => {
  mockFetch.mockReset().mockImplementation(async (path: string) =>
    path.endsWith('/presence') ? { enabled: false, peers: [] } : page,
  );
});

test('the teacher’s chat: the student’s name, attach and the microphone (the staff port)', async () => {
  await renderWithQuery(<TeacherChannelScreen />, freshQueryClient());
  expect(await screen.findByRole('header', { name: 'سلمى' })).toBeTruthy();
  expect(screen.getByLabelText(c.media.attach)).toBeTruthy();
  expect(screen.getByLabelText(c.media.record)).toBeTruthy();
  expect(mockFetch).toHaveBeenCalledWith('/teachers/me/channels/s1/messages');
});

test('the assistant’s chat says whose chat it is before the student', async () => {
  await renderWithQuery(<SalesChannelScreen />, freshQueryClient());
  expect(await screen.findByText(`${c.monitorTitle} · سلمى`)).toBeTruthy();
});
