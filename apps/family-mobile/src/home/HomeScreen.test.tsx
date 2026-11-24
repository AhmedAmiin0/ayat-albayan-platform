import AsyncStorage from '@react-native-async-storage/async-storage';
import { screen, waitFor } from '@testing-library/react-native';
import { PICKED_CHILD_KEY } from '@ab/client-core';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { student } from '@/portal/portal.fixtures';
import { HomeScreen } from './HomeScreen';

// A guardian of two lands on the child this profile picked; other profiles' picks don't count.

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswer(path)),
}));

const mockWho = { id: 'g1' };
const sara = student({ id: 's1', name: 'سارة' });
const yusuf = student({ id: 's2', code: 'AB-0002', name: 'يوسف' });
const READS: Record<string, unknown> = {
  lessons: { lessons: [], prepare: null, month: { attended: 1, absent: 0 } },
  reports: { reports: [] },
  package: { package: null, payments: [], payment_instructions: '' },
};
const mockAnswer = (path: string): unknown => {
  const answers: Record<string, unknown> = {
    '/auth/me': { id: mockWho.id, role: 'guardian', permissions: ['self.portal'] },
    '/portal/me': { kind: 'guardian', students: [sara, yusuf], renew_url: null },
  };
  const clean = path.split('?')[0] ?? '';
  return (
    answers[clean] ??
    READS[clean.split('/')[4] ?? ''] ?? { items: [], total: 0, page: 1, pageSize: 20, unread: 0 }
  );
};

/** Signed in as `id` (the root loads /auth/me before any screen). */
function show(id: string) {
  mockWho.id = id;
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), mockAnswer('/auth/me'));
  return renderWithQuery(<HomeScreen />, client);
}

// Saved before the app starts: the store reads it on its first use.
const SAVED = JSON.stringify({ profileId: 'g1', studentId: 's2' });
beforeAll(() => AsyncStorage.setItem(PICKED_CHILD_KEY, SAVED));

test("this profile's saved pick: that child's page, «حضرها» and «الباقة»", async () => {
  await show('g1');
  expect(await screen.findByRole('header', { name: 'يوسف' })).toBeTruthy();
  // A guardian sees today's date, not a greeting that would hail the parent by the child's name.
  expect(screen.queryByText(t.portal.app.home.greeting)).toBeNull();
  expect(screen.getByRole('tab', { name: t.portal.attendedTab })).toBeTruthy();
  expect(screen.getByRole('tab', { name: t.portal.packageTab })).toBeTruthy();
});

test("another profile's pick on this phone is not theirs: no child's page", async () => {
  const { client } = await show('g9');
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(screen.queryByRole('header', { name: 'يوسف' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'سارة' })).toBeNull();
  expect(screen.getByRole('header', { name: t.portal.app.home.greeting })).toBeTruthy();
});
