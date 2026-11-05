import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from '@ab/shared';
import { renderRouter, screen } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { TabStack } from '@/core/nav/TabStack';
import { useTreeBase } from '@/core/nav/tree-base';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { fullAccessMe } from '@/test/staff-me';
import AdminChatLayout from '../../../app/(admin-chat)/_layout';
import SalesChatLayout from '../../../app/(sales-chat)/_layout';
import TabsLayout from '../../../app/(tabs)/_layout';
import TeacherChatLayout from '../../../app/(teacher-chat)/_layout';
import { redirectSystemPath } from '../../../app/+native-intent';
import RootLayout from '../../../app/_layout';
import AssistantLayout from '../../../app/assistant/_layout';
import SalesLayout from '../../../app/sales/_layout';
import ShareRoute from '../../../app/share';
import TeacherLayout from '../../../app/teacher/_layout';

// docs/38: an Android share opens /share (+native-intent); the real gate hands it to its tree's
// chooser in the tree's chat group (stub choosers print the links base and thread mode they get).
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-sharing', () => ({ clearSharedPayloads: jest.fn() }));
jest.mock('@/core/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
const mockMe = { answer: {} as object };
const mockTeacher = { id: 't1', display_name_ar: 'نور', tz: 'Africa/Cairo', students: [] };
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) =>
    ({ '/auth/me': mockMe.answer, '/teachers/me': mockTeacher })[path] ?? { total: 0 },
}));
jest.mock('@/core/auth/use-auth-gate', () => ({
  ...jest.requireActual('@/core/auth/use-auth-gate'),
  useAuthGate: () => (globalThis as { gate?: string }).gate ?? 'out',
}));

function ChooserStub() {
  return <Text>{`chooser base=${useTreeBase()} mode=${useThreadMode().kind}`}</Text>;
}
const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  share: ShareRoute,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('admin-today'),
  '(tabs)/inbox/_layout': TabStack,
  '(tabs)/inbox/index': stub('admin-inbox'),
  '(tabs)/inbox/[id]': stub('lead-detail'),
  '(admin-chat)/_layout': AdminChatLayout,
  '(admin-chat)/inbox/share': ChooserStub,
  'teacher/_layout': TeacherLayout,
  'teacher/today/_layout': TabStack,
  'teacher/today/index': stub('teacher-today'),
  '(teacher-chat)/_layout': TeacherChatLayout,
  '(teacher-chat)/teacher/chats/share': ChooserStub,
  '(teacher-chat)/teacher/chats/[phone]': stub('teacher-chat'),
  'sales/_layout': SalesLayout,
  'sales/inbox/_layout': TabStack,
  'sales/inbox/index': stub('sales-inbox'),
  '(sales-chat)/_layout': SalesChatLayout,
  '(sales-chat)/sales/inbox/share': ChooserStub,
  'assistant/_layout': AssistantLayout,
  'assistant/lessons/_layout': TabStack,
  'assistant/lessons/index': stub('assistant-lessons'),
};

async function open(gate: string, url: string) {
  (globalThis as { gate?: string }).gate = gate;
  mockMe.answer = gate === 'out' ? {} : fullAccessMe(gate as UserRole);
  queryClient.setQueryData(pathKey('/auth/me'), mockMe.answer);
  const pending = renderRouter(app, { initialUrl: url });
  await pending;
  return { pathname: () => pending.getPathname(), segments: () => pending.getSegments() };
}

beforeEach(async () => {
  jest.clearAllMocks();
  queryClient.clear();
  await AsyncStorage.clear();
});

test('the share URL becomes /share; the Stripe return does not', () => {
  expect(redirectSystemPath({ path: 'ayatalbayan://expo-sharing', initial: true })).toBe('/share');
  const pay = 'ayatalbayan://pay-done?token=t&r=done';
  expect(redirectSystemPath({ path: pay, initial: false })).toBe(pay);
});

test.each([
  { gate: 'admin', path: '/inbox/share', group: '(admin-chat)', text: 'chooser base= mode=admin' },
  { gate: 'sales', path: '/sales/inbox/share', group: '(sales-chat)', text: 'chooser base=/sales mode=admin' },
  { gate: 'teacher', path: '/teacher/chats/share', group: '(teacher-chat)', text: 'chooser base= mode=teacher' },
])('$gate: /share replaces itself with $path in $group', async ({ gate, path, group, text }) => {
  const router = await open(gate, '/share');
  expect(await screen.findByText(text)).toBeTruthy();
  expect(router.pathname()).toBe(path);
  expect(router.segments()[0]).toBe(group);
});

test('the static share route outranks a lead (/inbox/[id]) and a teacher chat ([phone])', async () => {
  expect((await open('admin', '/inbox/share')).segments()[0]).toBe('(admin-chat)');
  expect(screen.queryByText('lead-detail')).toBeNull();
  await open('teacher', '/teacher/chats/share');
  expect(await screen.findByText('chooser base= mode=teacher')).toBeTruthy();
});

test('the classroom assistant has no chats: the note, the share dropped', async () => {
  await open('assistant', '/share');
  expect(await screen.findByText(t.inbox.share.noChats)).toBeTruthy();
  expect(Sharing.clearSharedPayloads).toHaveBeenCalled();
});

test('signed out: the login, never a chooser', async () => {
  const router = await open('out', '/share');
  expect(await screen.findByText('login-screen')).toBeTruthy();
  expect(router.pathname()).toBe('/login');
});
