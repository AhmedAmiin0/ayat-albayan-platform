import AsyncStorage from '@react-native-async-storage/async-storage';
import { router as nav } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import type { UserRole } from '@ab/shared';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { fullAccessMe } from '@/test/staff-me';
import { TabStack } from '@/core/nav/TabStack';
import { useStudentHref, useTreeBase } from '@/core/nav/tree-base';
import { type PushTree, routeIn } from '@/core/push/notification-route';
import AdminChatLayout from '../../../app/(admin-chat)/_layout';
import SalesChatLayout from '../../../app/(sales-chat)/_layout';
import TeacherChatLayout from '../../../app/(teacher-chat)/_layout';
import TabsLayout from '../../../app/(tabs)/_layout';
import RootLayout from '../../../app/_layout';
import SalesLayout from '../../../app/sales/_layout';
import TeacherLayout from '../../../app/teacher/_layout';

// The real root, tree and chat-group layouts with stub screens: each tree's chat is its own route group
// above the tabs (a full screen, react-native-screens#4132), behind its tree's gate, under the same URL.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/core/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
// /auth/me holding every permission of its role: nothing hidden, so each tree opens on its first tab.
const mockMe = { answer: {} as object };
const mockTeacher = { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) =>
    path === '/auth/me' ? mockMe.answer : path === '/teachers/me' ? mockTeacher : { total: 0 },
}));
jest.mock('@/auth/use-auth-gate', () => ({ useAuthGate: () => (globalThis as { gate?: string }).gate ?? 'out' }));

/** Any tree's chat: the links (TreeBase) and the mode (ThreadMode) its group gives it. */
function ChatStub() {
  return <Text>{`chat base=${useTreeBase()} mode=${useThreadMode().kind}`}</Text>;
}
const stub = (label: string) => () => <Text>{label}</Text>;
/** The student file opened from a chat's name: «عرض سجل الحضور» as the real screens build it (the tab's route). */
function StudentFileStub() {
  const to = useStudentHref();
  const base = useTreeBase();
  return <Text onPress={() => nav.push(to(`${base}/students/s1/attendance`))}>student-file</Text>;
}
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('admin-today'),
  '(admin-chat)/_layout': AdminChatLayout,
  '(admin-chat)/inbox/thread/[phone]': ChatStub,
  '(admin-chat)/inbox/student/[id]': StudentFileStub,
  '(admin-chat)/inbox/student/[id]/attendance': stub('chat-attendance'),
  'teacher/_layout': TeacherLayout,
  'teacher/today/_layout': TabStack,
  'teacher/today/index': stub('teacher-today'),
  '(teacher-chat)/_layout': TeacherChatLayout,
  '(teacher-chat)/teacher/chats/[phone]': ChatStub,
  'sales/_layout': SalesLayout,
  'sales/inbox/_layout': TabStack,
  'sales/inbox/index': stub('sales-inbox'),
  '(sales-chat)/_layout': SalesChatLayout,
  '(sales-chat)/sales/inbox/thread/[phone]': ChatStub,
  '(sales-chat)/sales/inbox/student/[id]': StudentFileStub,
  '(sales-chat)/sales/inbox/student/[id]/attendance': stub('chat-attendance'),
};

const PHONE = '+966552147730';
const ENC = encodeURIComponent(PHONE);

async function open(gate: string, url: string) {
  (globalThis as { gate?: string }).gate = gate;
  mockMe.answer = fullAccessMe(gate as UserRole);
  queryClient.setQueryData(pathKey('/auth/me'), mockMe.answer); // as verifyRole, before the gate opens
  const pending = renderRouter(app, { initialUrl: url });
  await pending;
  return { pathname: () => pending.getPathname(), segments: () => pending.getSegments() };
}

// The persisted cache (AsyncStorage) would carry one test's /auth/me into the next.
beforeEach(async () => {
  jest.clearAllMocks();
  queryClient.clear();
  await AsyncStorage.clear();
});

test.each([
  { tree: 'admin', path: '/inbox/thread', group: '(admin-chat)', text: 'chat base= mode=admin' },
  { tree: 'sales', path: '/sales/inbox/thread', group: '(sales-chat)', text: 'chat base=/sales mode=admin' },
  { tree: 'teacher', path: '/teacher/chats', group: '(teacher-chat)', text: 'chat base= mode=teacher' },
])('$tree: a message push opens $path/… in $group, a full screen with no tab bar', async ({ tree, path, group, text }) => {
  // The URL the push (and the bell, and every link) still builds: unchanged, so nothing redirects.
  expect(routeIn(tree as PushTree, { kind: 'new_message', phone: PHONE })).toBe(`${path}/${ENC}`);
  const router = await open(tree, `${path}/${ENC}`);
  expect(await screen.findByText(text)).toBeTruthy();
  expect(router.pathname()).toBe(`${path}/${PHONE}`);
  expect(router.segments()[0]).toBe(group);
  expect(screen.queryAllByRole('button')).toHaveLength(0); // no tab host around the chat
});

test.each([
  ['admin', '/sales/inbox/thread', /^\/$/],
  ['admin', '/teacher/chats', /^\/$/],
  ['sales', '/inbox/thread', /^\/sales/],
  ['sales', '/teacher/chats', /^\/sales/],
  ['teacher', '/inbox/thread', /^\/teacher/],
  ['teacher', '/sales/inbox/thread', /^\/teacher/],
  ['out', '/inbox/thread', /^\/login$/],
  ['out', '/sales/inbox/thread', /^\/login$/],
  ['out', '/teacher/chats', /^\/login$/],
])('%s opening %s/… never reaches another tree’s chat', async (gate, path, own) => {
  const router = await open(gate, `${path}/${ENC}`);
  expect(screen.queryByText(/^chat /)).toBeNull();
  expect(router.pathname()).toMatch(own);
});

// Review 2026-10-30: a tab route pushed from the chat group stacked a second tab host, so «رجوع» landed on Today.
test.each([
  { tree: 'admin', file: '/inbox/student/s1', group: '(admin-chat)' },
  { tree: 'sales', file: '/sales/inbox/student/s1', group: '(sales-chat)' },
])('$tree: the student file opened in a chat opens its screens inside $group; «رجوع» returns to the file', async ({ tree, file, group }) => {
  const router = await open(tree, file);
  await fireEvent.press(await screen.findByText('student-file'));
  expect(await screen.findByText('chat-attendance')).toBeTruthy();
  expect([router.pathname(), router.segments()[0]]).toEqual([`${file}/attendance`, group]);
  await act(async () => nav.back());
  expect(await screen.findByText('student-file')).toBeTruthy();
  expect(router.pathname()).toBe(file);
});
