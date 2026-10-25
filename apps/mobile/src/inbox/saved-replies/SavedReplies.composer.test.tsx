import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, message, thread } from '../thread-fixtures';
import { ThreadModeProvider } from '../thread-mode';
import { ThreadScreen } from '../ThreadScreen';
import { REPLIES } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const student = { id: 'st1', name: 'سلمى', code: 'AB-0001', teacher_name: null, status: 'active' as const, subscription: null };
const people = { guardian: null, lead: null, students: [student] };

async function open(last = minutesAgo(5), teacher = false) {
  const th = detail([inbound], { thread: { ...thread, last_inbound_at: last }, people });
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/saved-replies' ? REPLIES : p === '/me/profile' ? { full_name: 'سارة' } : p === '/messages/gate' ? { open: true, reason: null, queued: 0 } : th,
  );
  const ui = <ThreadScreen />;
  await renderWithQuery(teacher ? <ThreadModeProvider value={{ kind: 'teacher', teacherId: 't1' }}>{ui}</ThreadModeProvider> : ui, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const button = () => screen.getByRole('button', { name: t.savedReplies.open });

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('the button opens the sheet; a tap fills the box with the placeholders filled and sends nothing', async () => {
  await open();
  await fireEvent.press(button());
  await fireEvent.press(await screen.findByRole('button', { name: `${'ترحيب'}` }));
  expect(box().props.value).toBe('السلام عليكم، كيف نخدمك؟');
  await fireEvent.press(button());
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp('^الأسعار') }));
  expect(box().props.value).toBe('السلام عليكم، كيف نخدمك؟\nأهلًا هدى سالم، معك سارة. تجد الأسعار مرفقة لـسلمى.');
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(screen.getByTestId('saved-reply-chip')).toBeTruthy();
});

test('«/» at the start of the box opens the sheet and is replaced by the pick; mid-text it does not', async () => {
  await open();
  await fireEvent.changeText(box(), 'شكرًا');
  await fireEvent.changeText(box(), 'شكرًا/');
  expect(screen.queryByText(t.savedReplies.tabShared)).toBeNull();
  await fireEvent.changeText(box(), '');
  await fireEvent.changeText(box(), '/');
  await fireEvent.press(await screen.findByRole('button', { name: 'ترحيب' }));
  expect(box().props.value).toBe('السلام عليكم، كيف نخدمك؟');
});

test('tabs and search: «ردودي» shows her own; the search matches the text too', async () => {
  await open();
  await fireEvent.press(button());
  await screen.findByRole('button', { name: 'ترحيب' });
  expect(screen.queryByRole('button', { name: 'متابعة' })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.savedReplies.tabMine }));
  expect(screen.getByRole('button', { name: 'متابعة' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.savedReplies.tabShared }));
  await fireEvent.changeText(screen.getByLabelText(t.savedReplies.search), 'نخدمك');
  await waitFor(() => expect(screen.queryByRole('button', { name: /^الأسعار/ })).toBeNull());
  expect(screen.getByRole('button', { name: 'ترحيب' })).toBeTruthy();
});

test('the staged file: removable; «أرسل» sends the text, then stages and sends the file', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path.endsWith('/stage') ? { path: 'out/s1/r/x.pdf', filename: 'الأسعار.pdf' } : message({ id: path.endsWith('/file') ? 'f1' : 't1', status: 'queued' }),
  );
  await open();
  await fireEvent.press(button());
  await fireEvent.press(await screen.findByRole('button', { name: /^الأسعار/ }));
  const chip = screen.getByTestId('saved-reply-chip');
  await fireEvent.press(within(chip).getByRole('button', { name: t.savedReplies.stagedRemove.replace('{name}', 'الأسعار.pdf') }));
  expect(screen.queryByTestId('saved-reply-chip')).toBeNull();
  await fireEvent.press(button());
  await fireEvent.press(await screen.findByRole('button', { name: /^الأسعار/ }));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.send }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(3));
  const paths = mockApiSend.mock.calls.map((c: unknown[]) => c[1]);
  expect(paths).toEqual(['/threads/%2B966552147730/text', `/saved-replies/${REPLIES[0]?.id}/stage`, '/threads/%2B966552147730/file']);
  const [stageId, fileBody] = [mockApiSend.mock.calls[1]?.[2], mockApiSend.mock.calls[2]?.[2]];
  expect(fileBody).toEqual({ clientRequestId: stageId.clientRequestId, path: 'out/s1/r/x.pdf', filename: 'الأسعار.pdf' });
  await waitFor(() => expect(screen.queryByTestId('saved-reply-chip')).toBeNull());
});

test('outside the 24 h window the button is disabled and explains why', async () => {
  await open(minutesAgo(3 * 24 * 60));
  expect(button().props.accessibilityState).toEqual({ disabled: true });
  expect(button().props.accessibilityHint).toBe(t.savedReplies.closedHint);
  await fireEvent.press(button());
  expect(screen.getByText(t.savedReplies.closedHint)).toBeTruthy();
  expect(screen.queryByText(t.savedReplies.tabShared)).toBeNull();
});

test('a teacher never gets quick replies', async () => {
  await open(minutesAgo(5), true);
  expect(screen.queryByRole('button', { name: t.savedReplies.open })).toBeNull();
});
