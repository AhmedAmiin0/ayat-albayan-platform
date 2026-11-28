import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';
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
  mockApiFetch
    .mockReset()
    .mockImplementation(async (path: string) =>
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

test('the API’s members name the people, teacher first, whoever spoke', async () => {
  const participants = [
    { name: 'أبرار', role: 'teacher', me: false },
    { name: 'أم يوسف', role: 'guardian', me: true },
    { name: 'سارة', role: 'sales', me: false },
  ] as const;
  mockApiFetch.mockImplementation(async (path: string) =>
    path.endsWith('/presence')
      ? { enabled: false, peers: [] }
      : { ...page, participants: participants.map((x) => ({ ...x })) },
  );
  const refs = { audience: 'portal', studentId: 's1' } as const;
  await renderWithQuery(<ChannelScreen refs={refs} />, freshQueryClient());
  expect(await screen.findByTestId('channel-people')).toHaveTextContent(
    ['أبرار', 'سارة', t.studentChannel.you].join(t.studentChannel.namesJoin),
  );
});

test('staff: the student’s name is the title', async () => {
  const refs = { audience: 'teacher', studentId: 's1' } as const;
  await renderWithQuery(<ChannelScreen refs={refs} />, freshQueryClient());
  expect(await screen.findByRole('header', { name: 'يوسف' })).toBeTruthy();
});

test('a banner slot under the head (the room’s live lesson)', async () => {
  const refs = { audience: 'portal', studentId: 's1' } as const;
  const banner = <Text testID="live-banner">الحلقة الآن</Text>;
  await renderWithQuery(<ChannelScreen refs={refs} banner={banner} />, freshQueryClient());
  expect(await screen.findByTestId('live-banner')).toBeTruthy();
});
