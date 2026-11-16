import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PICKED_CHILD_KEY } from '@ab/client-core';
import { router } from 'expo-router';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing/query';
import { PICK_HREF } from '@/nav';
import { student } from '@/portal/portal.fixtures';
import { SwitchChildRow } from './SwitchChildRow';

// «حسابي» › «تبديل الطالب» (owner 2026-11-16): only for a guardian of two or more children.

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? '']),
}));

const ME = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const sara = student({ id: 's1', name: 'سارة' });
const yusuf = student({ id: 's2', code: 'AB-0002', name: 'يوسف' });
const mockAnswers: Record<string, unknown> = { '/auth/me': ME };

/** Signed in as g1 with /portal/me listing `students` of a `kind` login. */
async function show(kind: string, students: unknown[]) {
  mockAnswers['/portal/me'] = { kind, students, renew_url: null };
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), ME);
  const view = await renderWithQuery(<SwitchChildRow />, client);
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return view;
}

// g1 picked يوسف on this phone before.
const SAVED = JSON.stringify({ profileId: 'g1', studentId: 's2' });
beforeAll(() => AsyncStorage.setItem(PICKED_CHILD_KEY, SAVED));

beforeEach(() => jest.clearAllMocks());

test('a guardian of two: the child the app works as; a press opens «اختر الطالب»', async () => {
  await show('guardian', [sara, yusuf]);
  expect(await screen.findByText(t.portal.app.pick.switch)).toBeTruthy();
  expect(screen.getByText('يوسف')).toBeTruthy();
  await fireEvent.press(screen.getByText(t.portal.app.pick.switch));
  expect(router.push).toHaveBeenCalledWith(PICK_HREF);
});

test('a guardian of one child or a student: no switch', async () => {
  await show('guardian', [yusuf]);
  expect(screen.queryByText(t.portal.app.pick.switch)).toBeNull();
  await show('student', [yusuf, sara]);
  expect(screen.queryByText(t.portal.app.pick.switch)).toBeNull();
});
