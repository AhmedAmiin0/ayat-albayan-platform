import type { PortalKind } from '@ab/shared';
import { PUBLIC_CONFIG_PATH, PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { screen, waitFor } from '@testing-library/react-native';
import { pathKey, t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { StudentHome } from './StudentHome';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? ''] ?? {}),
}));

const ME = { id: 'g1', role: 'guardian', permissions: ['self.portal'] };
const sara = student();
const mockAnswers: Record<string, unknown> = {
  '/auth/me': ME,
  [PUBLIC_CONFIG_PATH]: { ...PUBLIC_SETTING_DEFAULTS, custom: {} },
};
const greeting = t.portal.app.home.greeting;

async function show(kind: PortalKind) {
  mockAnswers['/portal/me'] = { kind, students: [sara], renew_url: null };
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), ME);
  await renderWithQuery(<StudentHome student={sara} kind={kind} />, client);
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

test("a student's own home: the greeting over their name, then their own tabs", async () => {
  await show('student');
  expect(screen.getByText(greeting)).toBeTruthy();
  expect(screen.getByText(sara.name)).toBeTruthy();
  expect(screen.getByRole('tab', { name: t.portal.app.child.attendedSelf })).toBeTruthy();
});

test("a guardian on the child's home: the child's name, no greeting, the guardian's tabs", async () => {
  await show('guardian');
  expect(screen.queryByText(greeting)).toBeNull();
  expect(screen.getByText(sara.name)).toBeTruthy();
  expect(screen.getByRole('tab', { name: t.portal.attendedTab })).toBeTruthy();
});
