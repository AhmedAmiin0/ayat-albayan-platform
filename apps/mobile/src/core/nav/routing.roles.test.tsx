import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { TabStack } from '@/core/nav/TabStack';
import { registerPush } from '@/core/push/registerPush';
import TabsLayout from '../../../app/(tabs)/_layout';
import RootLayout from '../../../app/_layout';
import AssistantLayout from '../../../app/assistant/_layout';
import SalesLayout from '../../../app/sales/_layout';
import TeacherLayout from '../../../app/teacher/_layout';

// The real root and the four tree layouts with stub screens: the gate decides who reaches what.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/core/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
const mockMe = { answer: { role: 'sales', permissions: [] as string[] } };
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) => (path === '/auth/me' ? mockMe.answer : { total: 0 }),
}));
jest.mock('@/auth/use-auth-gate', () => ({ useAuthGate: () => (globalThis as { gate?: string }).gate ?? 'out' }));

const SALES = ['inbox.read', 'inbox.send', 'self.sales', 'self.sales_academy', 'self.sales_earnings', 'classroom.join'];
const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('admin-today'),
  '(tabs)/more/_layout': TabStack,
  '(tabs)/more/index': stub('admin-more'),
  'teacher/_layout': TeacherLayout,
  'teacher/today/index': stub('teacher-today'),
  'sales/_layout': SalesLayout,
  'sales/inbox/_layout': TabStack,
  'sales/inbox/index': stub('sales-inbox'),
  'sales/students': stub('sales-students'),
  'sales/schedule': stub('sales-schedule'),
  'sales/more/_layout': TabStack,
  'sales/more/index': stub('sales-more'),
  'assistant/_layout': AssistantLayout,
  'assistant/lessons/_layout': TabStack,
  'assistant/lessons/index': stub('assistant-lessons'),
  'assistant/more/_layout': TabStack,
  'assistant/more/index': stub('assistant-more'),
};

async function open(gate: string, url: string) {
  (globalThis as { gate?: string }).gate = gate;
  queryClient.setQueryData(pathKey('/auth/me'), mockMe.answer); // as verifyRole, before the gate opens
  const pending = renderRouter(app, { initialUrl: url });
  await pending;
  return { pathname: () => pending.getPathname() };
}

const tabLabels = () => screen.getAllByRole('button').map((tab) => tab.props.accessibilityLabel);

// The persisted cache (AsyncStorage) would carry one test's /auth/me into the next, as a sign-out would not.
beforeEach(async () => {
  jest.clearAllMocks();
  queryClient.clear();
  await AsyncStorage.clear();
});

test('sales: its own tabs in the web SalesNav order, «المحادثات» first', async () => {
  mockMe.answer = { role: 'sales', permissions: SALES };
  const router = await open('sales', '/sales');
  expect(await screen.findByText('sales-inbox')).toBeTruthy();
  expect(router.pathname()).toBe('/sales/inbox');
  await waitFor(() =>
    expect(tabLabels()).toEqual([t.sales.nav.chats, t.sales.nav.allStudents, t.sales.nav.scheduleTab, t.mobile.more]),
  );
});

test('assistant: «حلقاتي» then «المزيد»', async () => {
  mockMe.answer = { role: 'assistant', permissions: ['self.assistant', 'classroom.join', 'meetings.read'] };
  const router = await open('assistant', '/assistant');
  expect(await screen.findByText('assistant-lessons')).toBeTruthy();
  expect(router.pathname()).toBe('/assistant/lessons');
  await waitFor(() => expect(tabLabels()).toEqual([t.mobileRoles.lessonsTab, t.mobile.more]));
});

test.each([
  ['sales', '/', /^\/sales/],
  ['sales', '/more', /^\/sales/],
  ['sales', '/assistant/more', /^\/sales/],
  ['assistant', '/', /^\/assistant/],
  ['assistant', '/sales/inbox', /^\/assistant/],
  ['assistant', '/teacher/today', /^\/assistant/],
])('%s opening %s stays in its own tree', async (gate, url, own) => {
  mockMe.answer = { role: gate, permissions: [] };
  const router = await open(gate, url);
  for (const other of ['admin-today', 'admin-more', 'teacher-today', 'login-screen']) expect(screen.queryByText(other)).toBeNull();
  expect(router.pathname()).toMatch(own);
});

test.each([['admin'], ['teacher'], ['out']])('%s never reaches the sales or assistant tree', async (gate) => {
  mockMe.answer = { role: gate, permissions: [] };
  await open(gate, '/sales/inbox');
  expect(screen.queryByText('sales-inbox')).toBeNull();
  await open(gate, '/assistant/lessons');
  expect(screen.queryByText('assistant-lessons')).toBeNull();
});

test('the new trees register no push without notifications.push', async () => {
  mockMe.answer = { role: 'sales', permissions: SALES };
  await open('sales', '/sales');
  await screen.findByText('sales-inbox');
  mockMe.answer = { role: 'assistant', permissions: ['self.assistant'] };
  queryClient.clear();
  await AsyncStorage.clear();
  await open('assistant', '/assistant');
  await screen.findByText('assistant-lessons');
  expect(registerPush).not.toHaveBeenCalled();
});

test('a role widened to notifications.push registers this device', async () => {
  mockMe.answer = { role: 'sales', permissions: [...SALES, 'notifications.push'] };
  await open('sales', '/sales');
  await waitFor(() => expect(registerPush).toHaveBeenCalledTimes(1));
});
