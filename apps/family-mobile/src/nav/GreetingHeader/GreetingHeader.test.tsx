import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { PICKED_CHILD_KEY } from '@ab/client-core';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { GreetingHeader } from './GreetingHeader';
import { closeChildSwitch, useChildSwitch } from '@/nav/switch-store';

// Home's header as the child switch (canvas SwitchHome).

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? ''] ?? {}),
}));

const ME = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const sara = student({ id: 's1', name: 'سارة' });
const yusuf = student({ id: 's2', code: 'AB-0002', name: 'يوسف' });
const mockAnswers: Record<string, unknown> = { '/auth/me': ME };
const switchLabel = t.portal.app.pick.open.replace('{name}', 'يوسف');

async function show(students: unknown[]) {
  mockAnswers['/portal/me'] = { kind: 'guardian', students, renew_url: null };
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), ME);
  await renderWithQuery(<GreetingHeader title="يوسف" student={yusuf} />, client);
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

beforeEach(async () => {
  closeChildSwitch();
  await AsyncStorage.setItem(PICKED_CHILD_KEY, JSON.stringify({ profileId: 'g1', studentId: 's2' }));
});

test('a guardian of several: avatar, name and chevron are one button opening the sheet', async () => {
  await show([sara, yusuf]);
  const button = await screen.findByRole('button', { name: switchLabel });
  expect(screen.getByTestId('chevron-down', { includeHiddenElements: true })).toBeTruthy();
  await fireEvent.press(button);
  const sheet = await renderHook(() => useChildSwitch());
  expect(sheet.result.current.open).toBe(true);
});

test('an only child: the plain greeting, no switch', async () => {
  await show([yusuf]);
  expect(screen.queryByRole('button', { name: switchLabel })).toBeNull();
  expect(screen.queryByTestId('chevron-down', { includeHiddenElements: true })).toBeNull();
});
