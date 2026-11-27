import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, message, sentText, thread, uid } from '@/inbox/shared/thread-fixtures';
import { ThreadScreen } from '@/inbox/screens/ThreadScreen';
import { setComposerText } from '@/inbox/composer/draft-store';

// A sent correction ends only the edit tap it came from and restores the draft held before it.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const PHONE = '+966552147730';
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const ME = { id: 'u1', role: 'sales', permissions: ['inbox.read', 'inbox.send'] };
const OWN_ID = uid('o1');
const own = message({
  id: OWN_ID, status: 'delivered', body: 'الحلقة غدًا', replyable: true, sent_by_id: 'u1',
  created_at: minutesAgo(9),
});
const FIX = sentText({ id: uid('c1'), body: 'تصحيح: بعد غد', corrects_id: OWN_ID });
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const strip = () => screen.queryByTestId('edit-strip');
const pickEdit = async () => {
  await fireEvent(await screen.findByTestId(`bubble-${OWN_ID}`), 'longPress');
  const menu = within(screen.getByTestId('message-menu'));
  await fireEvent.press(menu.getByRole('button', { name: t.inbox.correction.action }));
};
const sendText = async (text: string) => {
  await fireEvent.changeText(box(), text);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
};

async function openChat(draft: string) {
  setComposerText(PHONE, draft);
  const data = detail([own], { thread: { ...thread, last_inbound_at: minutesAgo(5) } });
  const answers: Record<string, unknown> = {
    '/auth/me': ME,
    '/messages/gate': { open: true, reason: null, queued: 0 },
  };
  mockApiFetch.mockImplementation(async (path: string) => answers[path] ?? data);
  await renderWithQuery(<ThreadScreen />, createTestQueryClient({ meFromApi: true }));
  await act(async () => undefined);
}

beforeEach(() => {
  jest.clearAllMocks();
  setComposerText(PHONE, '');
});

test('a sent correction gives the empty box its draft from before the edit', async () => {
  mockApiSend.mockResolvedValue({ ...FIX, replayed: false });
  await openChat('مسودتي');
  await pickEdit();
  await sendText('بعد غد');
  await waitFor(() => expect(strip()).toBeNull());
  expect(box().props.value).toBe('مسودتي');
});

test('«تعديل» again while the first correction is in flight: its success keeps the new edit', async () => {
  let answer: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  await openChat('');
  await pickEdit();
  await sendText('بعد غد');
  await pickEdit();
  expect(box().props.value).toBe(own.body);
  await act(async () => answer({ ...FIX, replayed: false }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(1));
  expect(strip()).toBeTruthy();
  expect(box().props.value).toBe(own.body);
});
