import type { RegistrationCheckView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { LinkFamilyScreen } from './LinkFamilyScreen';

// «ربط بطالب موجود» (owner 2026-10-29): search by name or code, pick, confirm, POST { code }.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966501112223', leadId: 'lead-1' }),
}));

const lf = t.inbox.linkFamily;
const LINKER = { role: 'sales', permissions: ['students.check_registration', 'leads.link_family'] };
// Invented children (no real people).
const found: RegistrationCheckView = {
  found: true,
  more: false,
  matches: [
    { name: 'ريم', code: 'AB-0201', status: 'active', teacher_name: 'أ. هدى' },
    { name: 'سلمى', code: 'AB-0202', status: 'trial', teacher_name: null },
  ],
};
const confirmOf = (name: string, code: string) => lf.confirm.replace('{name}', name).replace('{code}', ltr(code));

async function openAndPick(me: unknown = LINKER) {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? me : found));
  const client = createTestQueryClient({ meFromApi: true });
  await renderWithQuery(<LinkFamilyScreen />, client);
  const field = await screen.findByLabelText(t.registrationCheck.query);
  await fireEvent.changeText(field, ' سلمى ');
  await fireEvent(field, 'submitEditing');
  await fireEvent.press(await screen.findByText('سلمى'));
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockReset();
});

test('the hint, then the search by name: the children as buttons; picking one asks to confirm by name and code', async () => {
  await openAndPick();
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/registration-check?q=${encodeURIComponent('سلمى')}`);
  expect(screen.getByText(confirmOf('سلمى', 'AB-0202'))).toBeTruthy();
  expect(screen.queryByText('ريم')).toBeNull();
  expect(screen.queryByText(lf.hint)).toBeNull();
  // «إلغاء» goes back to the children, nothing sent.
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(await screen.findByText('ريم')).toBeTruthy();
  expect(screen.getByText(lf.hint)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('«ربط الرقم» posts the code, refreshes the chats, leads and family, then says it was linked', async () => {
  mockApiSend.mockResolvedValue({ linked: true });
  const client = await openAndPick();
  const refresh = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(screen.getByRole('button', { name: lf.submit }));
  expect(await screen.findByText(lf.done)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/leads/lead-1/link-family', { code: 'AB-0202' });
  const keys = refresh.mock.calls.map((c) => c[0]?.queryKey);
  expect(keys).toEqual(expect.arrayContaining([['threads'], ['leads'], ['sales', 'money', 'family']]));
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.subscription.backToChat }));
  expect(router.back).toHaveBeenCalled();
});

test('{ linked: false }: the number already was this family’s', async () => {
  mockApiSend.mockResolvedValue({ linked: false });
  await openAndPick();
  await fireEvent.press(screen.getByRole('button', { name: lf.submit }));
  expect(await screen.findByText(lf.already)).toBeTruthy();
});

test('a 409 says why in her words and keeps the confirm to try another child', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'family_has_second_number', message: 'family_has_second_number' }));
  await openAndPick();
  await fireEvent.press(screen.getByRole('button', { name: lf.submit }));
  expect(await screen.findByText(lf.errors.family_has_second_number)).toBeTruthy();
  expect(screen.getByText(confirmOf('سلمى', 'AB-0202'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  await waitFor(() => expect(screen.queryByText(lf.errors.family_has_second_number)).toBeNull());
});

test('a one-letter name says it is too short and asks nothing; a search in flight says so', async () => {
  let answer: (v: RegistrationCheckView) => void = () => undefined;
  mockApiFetch.mockImplementation((path: string) =>
    path === '/auth/me'
      ? Promise.resolve(LINKER)
      : new Promise<RegistrationCheckView>((resolve) => {
          answer = resolve;
        }),
  );
  await renderWithQuery(<LinkFamilyScreen />, createTestQueryClient({ meFromApi: true }));
  const field = await screen.findByLabelText(t.registrationCheck.query);
  await fireEvent.changeText(field, 'س');
  await fireEvent(field, 'submitEditing');
  expect(await screen.findByText(t.registrationCheck.error.query_too_short)).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/sales/registration-check'));
  await fireEvent.changeText(field, 'سلمى');
  await fireEvent(field, 'submitEditing');
  expect(await screen.findByText(t.registrationCheck.checking)).toBeTruthy();
  expect(screen.queryByText(t.registrationCheck.error.query_too_short)).toBeNull();
  answer(found);
  expect(await screen.findByText('سلمى')).toBeTruthy();
});

test('without leads.link_family: the title only, no search', async () => {
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/me' ? { role: 'sales', permissions: ['students.check_registration'] } : found,
  );
  await renderWithQuery(<LinkFamilyScreen />, createTestQueryClient({ meFromApi: true }));
  expect(await screen.findByRole('header', { name: lf.title })).toBeTruthy();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(screen.queryByLabelText(t.registrationCheck.query)).toBeNull();
});
