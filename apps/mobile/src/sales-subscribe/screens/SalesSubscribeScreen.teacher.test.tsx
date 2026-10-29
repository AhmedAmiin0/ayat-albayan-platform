import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { familyOf, kid, openSub, salesQuote } from '../testing/fixtures';
import { SalesSubscribeScreen } from './SalesSubscribeScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223' }),
}));

const m = t.salesMoney;
const TRIAL = '7a000000-0000-4000-8000-000000000001';
const OTHER = '7a000000-0000-4000-8000-000000000002';
const creates = () => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/sales/subscriptions').map((c) => c[2] as Record<string, unknown>);
const answer = (teacherId: string | null) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/subscriptions/teachers' ? [{ id: TRIAL, name: 'أبرار' }, { id: OTHER, name: 'هدى' }] : familyOf(kid({ teacher_id: teacherId })),
  );
const save = async () => fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockImplementation(async (_m: string, path: string) => (path === '/sales/subscriptions/quote' ? salesQuote : openSub()));
});

// Owner 2026-10-29: the assistant assigns the teacher when the student subscribes (the chat opens after).
test('«المعلم/ة» starts on the trial’s teacher and is sent with the package', async () => {
  answer(TRIAL);
  await renderWithQuery(<SalesSubscribeScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('radio', { name: 'أبرار', checked: true })).toBeTruthy();
  expect(screen.getByText(m.teacherHint)).toBeTruthy();
  await save();
  await waitFor(() => expect(creates()[0]).toMatchObject({ teacherId: TRIAL }));
});

test('another teacher picked is sent instead', async () => {
  answer(TRIAL);
  await renderWithQuery(<SalesSubscribeScreen />, createTestQueryClient({ meFromApi: true }));
  await fireEvent.press(await screen.findByRole('radio', { name: 'هدى' }));
  await save();
  await waitFor(() => expect(creates()[0]).toMatchObject({ teacherId: OTHER }));
});

test('no teacher yet: «لم يُعيَّن معلم/ة بعد» is picked and nothing is assigned', async () => {
  answer(null);
  await renderWithQuery(<SalesSubscribeScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('radio', { name: m.teacherNone, checked: true })).toBeTruthy();
  await save();
  await waitFor(() => expect(creates()).toHaveLength(1));
  expect(creates()[0]).not.toHaveProperty('teacherId');
});
