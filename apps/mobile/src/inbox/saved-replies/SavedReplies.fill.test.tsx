import { fireEvent, screen, within } from '@testing-library/react-native';
import type { SavedReply } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { detail, inbound, thread } from '../shared/thread-fixtures';
import { ThreadScreen } from '../screens/ThreadScreen';
import { REPLIES, WELCOME } from './fixtures';

// «أكمل الرد» (owner 2026-10-27): a reply with blanks asks for them before it goes into the box.

const DEPOSIT: SavedReply = {
  ...WELCOME,
  id: '5a000000-0000-4000-8000-000000000004',
  title: 'العربون',
  body: 'أهلًا {name}، العربون [المبلغ] ريال قبل [التاريخ]. المبلغ: [المبلغ]',
  attachment: { name: 'الحساب.pdf', mime: 'application/pdf', size: 1024 },
};

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

async function open() {
  const th = detail([inbound], { thread: { ...thread, last_inbound_at: new Date(Date.now() - 5 * 60_000).toISOString() } });
  mockApiFetch.mockImplementation(async (p: string) =>
    p === '/saved-replies' ? [...REPLIES, DEPOSIT] : p === '/me/profile' ? { full_name: 'سارة' } : p === '/messages/gate' ? { open: true, reason: null, queued: 0 } : th,
  );
  await renderWithQuery(<ThreadScreen />, createTestQueryClient());
  await screen.findByText(inbound.body ?? '');
}
const box = () => screen.getByLabelText(t.inbox.composer.placeholder);
const form = () => screen.getByTestId('fill-reply-sheet');
const preview = () => screen.getByTestId('fill-reply-preview').props.children;
async function pickFromSheet(title: string | RegExp) {
  // «الردود السريعة» is a tile of the paperclip's sheet (owner 2026-10-27, WhatsApp Business).
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.composer.attach }));
  await fireEvent.press(within(screen.getByTestId('attach-sheet')).getByRole('button', { name: t.savedReplies.open }));
  await fireEvent.press(await screen.findByRole('button', { name: title }));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
});

test('no blanks, every name known: the tap fills the box at once, no form', async () => {
  await open();
  await pickFromSheet(WELCOME.title);
  expect(screen.queryByTestId('fill-reply-sheet')).toBeNull();
  expect(box().props.value).toBe(WELCOME.body);
});

test('blanks: one input per slot (the name prefilled), a live preview, «أدرج» fills the box once and stages the file', async () => {
  await open();
  await pickFromSheet(/^العربون/);
  const sheet = form();
  expect(within(sheet).getByText(DEPOSIT.title)).toBeTruthy();
  expect(screen.queryByTestId('saved-replies-sheet')).toBeNull();
  const name = within(sheet).getByLabelText(t.savedReplies.placeholders.name);
  expect(name.props.value).toBe('هدى سالم');
  expect(name.props.autoFocus).toBe(true);
  const amount = within(sheet).getByLabelText('المبلغ');
  expect(amount.props.keyboardType).toBe('numeric');
  expect(within(sheet).getByLabelText('التاريخ').props.keyboardType).toBe('default');
  expect(preview()).toBe('أهلًا هدى سالم، العربون [المبلغ] ريال قبل [التاريخ]. المبلغ: [المبلغ]');
  await fireEvent.changeText(amount, '300');
  expect(preview()).toBe('أهلًا هدى سالم، العربون 300 ريال قبل [التاريخ]. المبلغ: 300');
  await fireEvent.press(within(sheet).getByRole('button', { name: t.savedReplies.fill.insert }));
  expect(box().props.value).toBe('أهلًا هدى سالم، العربون 300 ريال قبل [التاريخ]. المبلغ: 300');
  expect(screen.queryByTestId('fill-reply-sheet')).toBeNull();
  expect(screen.getByTestId('saved-reply-chip')).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«إلغاء» puts nothing in the box and stages nothing', async () => {
  await open();
  await fireEvent.changeText(box(), 'مسودة');
  await pickFromSheet(/^العربون/);
  await fireEvent.press(within(form()).getByRole('button', { name: t.common.cancel }));
  expect(screen.queryByTestId('fill-reply-sheet')).toBeNull();
  expect(box().props.value).toBe('مسودة');
  expect(screen.queryByTestId('saved-reply-chip')).toBeNull();
});

test('a placeholder with no known value opens the form too; left empty it is removed cleanly', async () => {
  await open();
  await pickFromSheet(/^الأسعار/);
  const student = within(form()).getByLabelText(t.savedReplies.placeholders.student);
  expect(student.props.value).toBe('');
  await fireEvent.press(within(form()).getByRole('button', { name: t.savedReplies.fill.insert }));
  expect(box().props.value).toBe('أهلًا هدى سالم، معك سارة. تجد الأسعار مرفقة لـ.');
});

test('from the «/» list: the form opens, the box losing focus keeps the «/search», «أدرج» replaces it', async () => {
  await open();
  for (const step of ['سطر\n', 'سطر\n/', 'سطر\n/عر']) await fireEvent.changeText(box(), step);
  await fireEvent.press(await within(screen.getByTestId('slash-suggestions')).findByRole('button', { name: /^العربون/ }));
  await fireEvent(box(), 'blur');
  expect(screen.queryByTestId('slash-suggestions')).toBeNull();
  await fireEvent.changeText(within(form()).getByLabelText('التاريخ'), 'الخميس');
  await fireEvent.press(within(form()).getByRole('button', { name: t.savedReplies.fill.insert }));
  expect(box().props.value).toBe('سطر\nأهلًا هدى سالم، العربون [المبلغ] ريال قبل الخميس. المبلغ: [المبلغ]');
  expect(screen.getByTestId('saved-reply-chip')).toBeTruthy();
});

test('«إلغاء» from the «/» list keeps the «/search» in the box and docks its list again', async () => {
  await open();
  for (const step of ['/', '/عر']) await fireEvent.changeText(box(), step);
  await fireEvent.press(await within(screen.getByTestId('slash-suggestions')).findByRole('button', { name: /^العربون/ }));
  await fireEvent(box(), 'blur');
  await fireEvent.press(within(form()).getByRole('button', { name: t.common.cancel }));
  expect(box().props.value).toBe('/عر');
  expect(screen.getByTestId('slash-suggestions')).toBeTruthy();
  expect(screen.queryByTestId('saved-reply-chip')).toBeNull();
});
