import { screen } from '@testing-library/react-native';
import { t } from '../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../testing/query';
import { ChannelScreen } from './ChannelScreen';
import { channelMessage, channelPage } from './testing/channel-fixtures';

const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(async () => ({})),
}));

const page = channelPage({
  student_name: 'يوسف',
  messages: [
    channelMessage({ id: 'm1', sender_name: 'فاطمة', sender_role: 'teacher' }),
    channelMessage({ id: 'm2', sender_name: 'زهراء', sender_role: 'sales' }),
  ],
});

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(async (path: string) =>
    path.endsWith('/presence') ? { enabled: false, peers: [] } : page,
  );
});

test('the family’s head: the app’s title with the student, the people, «أنت» last', async () => {
  const refs = { audience: 'portal', studentId: 's1' } as const;
  await renderWithQuery(<ChannelScreen refs={refs} title="المحادثة" />, freshQueryClient());
  expect(await screen.findByText('المحادثة · يوسف')).toBeTruthy();
  expect(screen.getByTestId('channel-people')).toHaveTextContent(
    ['زهراء', 'فاطمة', t.studentChannel.you].join(t.studentChannel.namesJoin),
  );
});

test('staff: the student’s name is the title', async () => {
  const refs = { audience: 'teacher', studentId: 's1' } as const;
  await renderWithQuery(<ChannelScreen refs={refs} />, freshQueryClient());
  expect(await screen.findByRole('header', { name: 'يوسف' })).toBeTruthy();
});
