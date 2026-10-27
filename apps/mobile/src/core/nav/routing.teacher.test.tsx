import { act, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { supabase } from '@/core/lib/http/supabase';
import { t } from '@/core/lib/i18n/i18n';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { fullAccessMe } from '@/test/staff-me';
import { TabStack } from '@/core/nav/TabStack';
import { registerPush } from '@/core/push/registerPush';
import TabsLayout from '../../../app/(tabs)/_layout';
import RootLayout from '../../../app/_layout';
import TeacherLayout from '../../../app/teacher/_layout';

// The real root, admin and teacher layouts with stub screens: the gate decides who reaches what.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@/core/push/registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('@/auth/use-auth-gate', () => {
  const { useState } = jest.requireActual('react');
  const gate = { initial: 'out', set: (() => undefined) as (mockStatus: string) => void };
  return {
    mockGate: gate,
    useAuthGate: () => {
      const [status, set] = useState(gate.initial);
      gate.set = set;
      return status;
    },
  };
});
const { mockGate } = jest.requireMock('@/auth/use-auth-gate') as {
  mockGate: { initial: string; set: (s: string) => void };
};

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('admin-today'),
  '(tabs)/inbox/_layout': TabStack,
  '(tabs)/inbox/index': stub('admin-inbox'),
  '(tabs)/students/_layout': TabStack,
  '(tabs)/students/index': stub('admin-students'),
  '(tabs)/more/_layout': TabStack,
  '(tabs)/more/index': stub('admin-more'),
  'teacher/_layout': TeacherLayout,
  'teacher/today/_layout': TabStack,
  'teacher/today/index': stub('teacher-today'),
  'teacher/schedule': stub('teacher-schedule'),
  'teacher/chats/_layout': TabStack,
  'teacher/chats/index': stub('teacher-chats'),
  'teacher/more/students': stub('teacher-students'),
  'teacher/reports/_layout': TabStack,
  'teacher/reports/index': stub('teacher-reports'),
  'teacher/more/_layout': TabStack,
  'teacher/more/index': stub('teacher-more'),
};

const ADMIN_STUBS = ['admin-today', 'admin-inbox', 'admin-students', 'admin-more'];

async function open(initialUrl: string) {
  const pending = renderRouter(app, { initialUrl });
  await pending;
  return { pathname: () => pending.getPathname() };
}

beforeEach(() => {
  jest.clearAllMocks();
  const teacher = { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? fullAccessMe('teacher') : teacher));
  // As verifyRole: /auth/me is in the cache when the gate opens a tree (docs/27 E2).
  queryClient.setQueryData(pathKey('/auth/me'), fullAccessMe('teacher'));
});

test('teacher: her five native tabs in RTL order, «اليوم» first, and this device registered for her pushes', async () => {
  mockGate.initial = 'teacher';
  const router = await open('/teacher');
  expect(screen.getByText('teacher-today')).toBeTruthy();
  expect(router.pathname()).toBe('/teacher/today');
  const tabs = screen.getAllByRole('button');
  expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
    t.teacherNav.today,
    t.teacherNav.calendar,
    t.nav.conversations,
    t.teacherNav.reports,
    t.mobile.more,
  ]);
  expect(registerPush).toHaveBeenCalledTimes(1);
});

test.each([['/'], ['/students'], ['/inbox'], ['/more'], ['/login']])(
  'teacher opening %s never reaches an admin screen or /login',
  async (url) => {
    mockGate.initial = 'teacher';
    const router = await open(url);
    for (const admin of [...ADMIN_STUBS, 'login-screen']) expect(screen.queryByText(admin)).toBeNull();
    expect(router.pathname()).toMatch(/^\/teacher/);
  },
);

test('admin cannot open the teacher tabs', async () => {
  mockGate.initial = 'admin';
  const router = await open('/teacher/reports');
  expect(screen.queryByText('teacher-reports')).toBeNull();
  expect(router.pathname()).toBe('/');
});

test('out (a guardian, an unknown role, no session): only /login', async () => {
  mockGate.initial = 'out';
  const router = await open('/teacher/chats');
  expect(screen.getByText('login-screen')).toBeTruthy();
  expect(router.pathname()).toBe('/login');
});

test('sign-in as a teacher opens her tabs; sign-out returns to login', async () => {
  mockGate.initial = 'out';
  await open('/');
  await act(async () => mockGate.set('teacher'));
  expect(screen.getByText('teacher-today')).toBeTruthy();
  await act(async () => mockGate.set('out'));
  expect(screen.getByText('login-screen')).toBeTruthy();
});

test('the inbox live channel (docs/12 §15): the admin tree joins it, sign-out leaves it, the teacher tree never', async () => {
  mockGate.initial = 'teacher';
  await open('/');
  await act(async () => undefined);
  expect(supabase.channel).not.toHaveBeenCalled();
  await act(async () => mockGate.set('admin'));
  await act(async () => undefined);
  expect(supabase.channel).toHaveBeenCalledTimes(1);
  expect(supabase.channel).toHaveBeenCalledWith('inbox:staff', { config: { private: true } });
  await act(async () => mockGate.set('out'));
  expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
  await act(async () => mockGate.set('teacher'));
  await act(async () => undefined);
  expect(supabase.channel).toHaveBeenCalledTimes(1);
});
