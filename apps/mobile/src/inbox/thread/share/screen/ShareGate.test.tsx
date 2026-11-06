import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Sharing from 'expo-sharing';
import { Text } from 'react-native';
import { type GateStatus, RootGateProvider } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { queryClient } from '@/core/lib/query/query-client';
import { pathKey } from '@/core/lib/query/query-keys';
import { fullAccessMe } from '@/test/staff-me';
import { ShareGate } from './ShareGate';

// docs/38: /share reads the root layout's gate (here a provider, no auth module doubled).
jest.mock('expo-sharing', () => ({ clearSharedPayloads: jest.fn() }));

const stub = (label: string) => () => <Text>{label}</Text>;

function openShare(gate: GateStatus) {
  const Layout = () => (
    <QueryClientProvider client={queryClient}>
      <RootGateProvider value={gate}>
        <Stack screenOptions={{ headerShown: false }} />
      </RootGateProvider>
    </QueryClientProvider>
  );
  const app = {
    _layout: Layout,
    index: stub('admin-home'),
    share: ShareGate,
    'teacher/today/index': stub('teacher-today'),
  };
  return renderRouter(app, { initialUrl: '/share' });
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
});

test('booting: a neutral wait, no «nothing to share into», the share untouched', async () => {
  await openShare('booting');
  expect(await screen.findByLabelText(t.common.loading)).toBeTruthy();
  expect(screen.queryByText(t.inbox.share.noChats)).toBeNull();
  expect(Sharing.clearSharedPayloads).not.toHaveBeenCalled();
});

test('a teacher without the chats: the note, and «رجوع» opens the teacher tree, not «/»', async () => {
  const me = fullAccessMe('teacher');
  const permissions = me.permissions.filter((key) => key !== 'inbox.read');
  queryClient.setQueryData(pathKey('/auth/me'), { ...me, permissions });
  const router = openShare('teacher');
  await router;
  expect(await screen.findByText(t.inbox.share.noChats)).toBeTruthy();
  expect(Sharing.clearSharedPayloads).toHaveBeenCalled();
  await fireEvent.press(screen.getByText(t.common.back));
  expect(await screen.findByText('teacher-today')).toBeTruthy();
  expect(router.getPathname()).toBe('/teacher/today');
  expect(screen.queryByText('admin-home')).toBeNull();
});
