import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PICKED_CHILD_KEY } from '@ab/client-core';
import { router } from 'expo-router';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { PickChildScreen } from './PickChildScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
}));

const sara = student({ id: 's1', name: 'سارة' });
const yusuf = student({ id: 's2', code: 'AB-0002', name: 'يوسف' });
const READS: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 1, absent: 0 } },
  reports: { reports: [] },
  package: { package: null, payments: [], payment_instructions: '' },
};
const ME = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const mockAnswer = (path: string): unknown => {
  const answers: Record<string, unknown> = {
    '/auth/me': ME,
    '/portal/me': { kind: 'guardian', students: [sara, yusuf], renew_url: null },
  };
  const clean = path.split('?')[0] ?? '';
  return (
    answers[clean] ??
    READS[clean.split('/')[4] ?? ''] ?? { items: [], total: 0, page: 1, pageSize: 20, unread: 0 }
  );
};

/** Signed in as g1 (the root loads /auth/me before any screen); `cached`: /portal/me read too. */
function show(cached = false) {
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), ME);
  if (cached) client.setQueryData(pathKey('/portal/me'), mockAnswer('/portal/me'));
  return renderWithQuery(<PickChildScreen />, client);
}

test('forced: the title, the hint, one card per child and no way back', async () => {
  await show();
  expect(await screen.findByRole('button', { name: /يوسف/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /سارة/ })).toBeTruthy();
  expect(screen.getByText(t.portal.app.pick.title)).toBeTruthy();
  expect(screen.getByText(t.portal.app.pick.hint)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.common.back })).toBeNull();
});

test("a press saves the child under this profile and goes to the child's home", async () => {
  await show();
  await fireEvent.press(await screen.findByRole('button', { name: /يوسف/ }));
  expect(router.dismissTo).toHaveBeenCalledWith('/');
  await waitFor(async () =>
    expect(await AsyncStorage.getItem(PICKED_CHILD_KEY)).toBe(
      JSON.stringify({ profileId: 'g1', studentId: 's2' }),
    ),
  );
});

test('switching: «رجوع» back to «حسابي» and no hint', async () => {
  await show(true);
  expect(await screen.findByRole('button', { name: t.common.back })).toBeTruthy();
  expect(screen.getByRole('button', { name: /سارة/ })).toBeTruthy();
  expect(screen.queryByText(t.portal.app.pick.hint)).toBeNull();
});
