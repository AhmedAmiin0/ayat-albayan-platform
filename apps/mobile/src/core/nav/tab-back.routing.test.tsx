import { QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { t } from '@/core/lib/i18n/i18n';
import { pushInTab } from '@/core/nav/back-within';
import { StudentScreen } from '@/students/screens/StudentScreen';
import { createTestQueryClient } from '@/test/query';
import { openTabApp, tabApp, TabsLayout } from '@/test/tab-app';

// The real tab stacks and StudentScreen (its profile still loading) under the real tabs.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const client = createTestQueryClient();
const WithQuery = () => (
  <QueryClientProvider client={client}>
    <TabsLayout />
  </QueryClientProvider>
);
const app = tabApp(WithQuery, StudentScreen);
const open = (initialUrl: string) => openTabApp(app, initialUrl);

const go = (move: () => void) => act(async () => move());
const pressHeaderBack = () => fireEvent.press(screen.getByRole('button', { name: t.common.back }));

afterEach(() => jest.restoreAllMocks());

test('StudentScreen alone in its tab (pushed from Today): header back opens the students list', async () => {
  const path = await open('/');
  await go(() => router.push('/students/s1'));
  expect(path()).toBe('/students/s1');
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(screen.getByText('students-list')).toBeTruthy();
});

test('StudentScreen opened from the list: header back pops to it', async () => {
  const path = await open('/students');
  const replace = jest.spyOn(router, 'replace');
  await go(() => router.push('/students/s1'));
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(replace).not.toHaveBeenCalled();
});

test('a cross-tab pushInTab loads the list beneath: back pops to it', async () => {
  const path = await open('/');
  await go(() => pushInTab('/students/s1'));
  expect(router.canDismiss()).toBe(true);
  const replace = jest.spyOn(router, 'replace');
  await pressHeaderBack();
  expect(path()).toBe('/students');
  expect(replace).not.toHaveBeenCalled();
});
