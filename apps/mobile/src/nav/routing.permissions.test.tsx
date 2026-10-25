import { act, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { queryClient } from '@/core/lib/query/query-client';
import { TabStack } from '@/nav/TabStack';
import TabsLayout from '../../app/(tabs)/_layout';
import RootLayout from '../../app/_layout';
import TeacherLayout from '../../app/teacher/_layout';

// Permission-aware tabs: the real layouts, /auth/me answered by the test.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
const mockMe = { answer: null as null | { role: string; permissions: string[] } };
const mockApiFetch = jest.fn(async (path: string) => {
  if (path === '/auth/me') {
    if (!mockMe.answer) return new Promise(() => undefined); // still loading
    return mockMe.answer;
  }
  if (path.startsWith('/teachers/me')) return { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
  return { total: 0 };
});
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('@/auth/use-auth-gate', () => ({ useAuthGate: () => (globalThis as { gate?: string }).gate ?? 'admin' }));

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('today'),
  '(tabs)/schedule': stub('schedule'),
  '(tabs)/inbox/_layout': TabStack,
  '(tabs)/inbox/index': stub('inbox'),
  '(tabs)/students/_layout': TabStack,
  '(tabs)/students/index': stub('students'),
  '(tabs)/more/_layout': TabStack,
  '(tabs)/more/index': stub('more'),
  'teacher/_layout': TeacherLayout,
  'teacher/today/_layout': TabStack,
  'teacher/today/index': stub('t-today'),
  'teacher/schedule': stub('t-schedule'),
  'teacher/chats/_layout': TabStack,
  'teacher/chats/index': stub('t-chats'),
  'teacher/reports/_layout': TabStack,
  'teacher/reports/index': stub('t-reports'),
  'teacher/more/_layout': TabStack,
  'teacher/more/index': stub('t-more'),
};
const labels = () => screen.getAllByRole('button').map((tab) => tab.props.accessibilityLabel);

beforeEach(() => {
  queryClient.clear(); // the app's own client is shared: no answer from the previous test
  mockMe.answer = null;
  (globalThis as { gate?: string }).gate = 'admin';
});

test('while /auth/me is loading nothing is hidden (no flicker)', async () => {
  await renderRouter(app, { initialUrl: '/' });
  expect(labels()).toEqual([t.mobile.today, t.schedule.nav, t.nav.conversations, t.nav.students, t.mobile.more]);
});

test('an accountant (payments only) keeps «المزيد» and loses the four admin tabs', async () => {
  mockMe.answer = { role: 'admin', permissions: ['payments.read'] };
  await renderRouter(app, { initialUrl: '/more' });
  await waitFor(() => expect(labels()).toEqual([t.mobile.more]));
});

test('seeded permissions (verifyRole) hide the tabs on the very first render, starting at the root', async () => {
  queryClient.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: ['payments.read'] });
  await renderRouter(app, { initialUrl: '/' });
  expect(labels()).toEqual([t.mobile.more]); // never all five first
});

test('a role with leads.read only keeps the Inbox tab (it hosts the leads list)', async () => {
  mockMe.answer = { role: 'admin', permissions: ['leads.read'] };
  await renderRouter(app, { initialUrl: '/more' });
  await waitFor(() => expect(labels()).toEqual([t.nav.conversations, t.mobile.more]));
});

test('a role with inbox.read and students.read keeps those tabs only (plus «المزيد»)', async () => {
  mockMe.answer = { role: 'admin', permissions: ['inbox.read', 'students.read'] };
  await renderRouter(app, { initialUrl: '/more' });
  await waitFor(() => expect(labels()).toEqual([t.nav.conversations, t.nav.students, t.mobile.more]));
});

test('the system admin (every permission) sees all five', async () => {
  mockMe.answer = { role: 'admin', permissions: ['lessons.read', 'inbox.read', 'students.read'] };
  await renderRouter(app, { initialUrl: '/' });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(labels()).toEqual([t.mobile.today, t.schedule.nav, t.nav.conversations, t.nav.students, t.mobile.more]);
});

test('a teacher without inbox.read loses «المحادثات»; with it she keeps all five', async () => {
  (globalThis as { gate?: string }).gate = 'teacher';
  mockMe.answer = { role: 'teacher', permissions: ['reports.read'] };
  await renderRouter(app, { initialUrl: '/teacher' });
  await waitFor(() =>
    expect(labels()).toEqual([t.teacherNav.today, t.teacherNav.calendar, t.teacherNav.reports, t.mobile.more]),
  );
});

test('a teacher holding inbox.read keeps «المحادثات»', async () => {
  (globalThis as { gate?: string }).gate = 'teacher';
  mockMe.answer = { role: 'teacher', permissions: ['inbox.read'] };
  await renderRouter(app, { initialUrl: '/teacher' });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  await act(async () => undefined);
  expect(labels()).toEqual([t.teacherNav.today, t.teacherNav.calendar, t.nav.conversations, t.teacherNav.reports, t.mobile.more]);
});
