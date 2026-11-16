import {
  PUBLIC_CONFIG_PATH,
  PUBLIC_CONFIG_QUERY_KEY,
  PUBLIC_SETTING_DEFAULTS,
  type PortalKind,
  type PortalStudent,
  type PublicConfig,
} from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { student } from '@/portal/portal.fixtures';
import { ChildBody } from './ChildBody';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const READS: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 1, absent: 0 } },
  history: { rows: [], next_cursor: null },
  package: { package: null, payments: [], payment_instructions: 'حوّلوا إلى الحساب' },
};
/** GET /settings/public as the API answers it: the public settings plus `custom`. */
const config = (over: Partial<PublicConfig> = {}): PublicConfig => ({
  ...PUBLIC_SETTING_DEFAULTS,
  custom: {},
  ...over,
});
let settings: unknown = config();
const chatTab = t.portal.app.child.chat;
const channelReads = () => mockFetch.mock.calls.filter(([p]) => String(p).includes('/channel'));

/** The child's body, once GET /settings/public has answered (so an absent pill means off). */
async function body(kind: PortalKind, over: Partial<PortalStudent> = {}) {
  const client = freshQueryClient();
  await renderWithQuery(<ChildBody student={student(over)} kind={kind} />, client);
  const state = () => client.getQueryState(PUBLIC_CONFIG_QUERY_KEY)?.status;
  await waitFor(() => expect(state()).toBe('success'));
}

beforeEach(() => {
  jest.clearAllMocks();
  settings = config();
  mockFetch.mockImplementation(async (path: string) =>
    path === PUBLIC_CONFIG_PATH ? settings : READS[path.split('?')[0]?.split('/')[4] ?? ''],
  );
});

test('a guardian: the four tabs; «الباقة» shows the transfer text', async () => {
  await body('guardian');
  expect(screen.getByRole('tab', { name: t.portal.attendedTab })).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: t.portal.packageTab }));
  expect(await screen.findByText('حوّلوا إلى الحساب')).toBeTruthy();
});

test("a child's own login: «حضرتها» / «غبت عنها», never the package nor its request", async () => {
  await body('student');
  expect(screen.getByRole('tab', { name: t.portal.app.child.attendedSelf })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: t.portal.packageTab })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.portal.app.child.absentSelf }));
  expect(await screen.findByText(t.portal.absentEmpty)).toBeTruthy();
  expect(mockFetch.mock.calls.some(([p]) => String(p).endsWith('/package'))).toBe(false);
});

test('an adult who is their own contact sees their package', async () => {
  await body('student', { contact_is_self: true });
  expect(screen.getByRole('tab', { name: t.portal.packageTab })).toBeTruthy();
});

test.each([
  ['unset', { custom: {} }],
  ['off', config({ family_chat_enabled: false })],
])('the family chat %s: four pills, no «المحادثة», no channel request', async (_, answer) => {
  settings = answer;
  await body('guardian');
  expect(screen.getAllByRole('tab')).toHaveLength(4);
  expect(screen.queryByRole('tab', { name: chatTab })).toBeNull();
  expect(channelReads()).toEqual([]);
});

test("the family chat on: a guardian's «المحادثة» opens chat/[id], no panel request", async () => {
  settings = config({ family_chat_enabled: true });
  await body('guardian');
  await fireEvent.press(await screen.findByRole('tab', { name: chatTab }));
  expect(router.push).toHaveBeenCalledWith(`/chat/${student().id}`);
  expect(screen.getAllByRole('tab')).toHaveLength(5);
  expect(channelReads()).toEqual([]);
});

test("the family chat on: a child's own login chats too (owner 2026-11-16)", async () => {
  settings = config({ family_chat_enabled: true });
  await body('student');
  await fireEvent.press(await screen.findByRole('tab', { name: chatTab }));
  expect(router.push).toHaveBeenCalledWith(`/chat/${student().id}`);
  expect(screen.getAllByRole('tab')).toHaveLength(4);
  expect(channelReads()).toEqual([]);
});
