import { screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { PackageScreen } from '@/package/PackageScreen';

const mockAnswers: Record<string, unknown> = {};
const mockFetch = jest.fn(async (path: string) => mockAnswers[path.split('?')[0] ?? '']);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const kid = student();
const open = (id: string) => jest.mocked(useLocalSearchParams).mockReturnValue({ id });
const asks = (part: string) => mockFetch.mock.calls.some(([path]) => path.includes(part));
const show = () => renderWithQuery(<PackageScreen />, freshQueryClient());

beforeEach(() => jest.clearAllMocks());

test('a guardian: the package heading with the name, and the package is read', async () => {
  mockAnswers['/portal/me'] = { kind: 'guardian', students: [kid], renew_url: null };
  open(kid.id);
  await show();
  expect(await screen.findByText(`${t.portal.packageTab} · ${kid.name}`)).toBeTruthy();
  await waitFor(() => expect(asks('/package')).toBe(true));
});

test('a child login: only the name, the empty note, and no package request', async () => {
  mockAnswers['/portal/me'] = { kind: 'student', students: [kid], renew_url: null };
  open(kid.id);
  await show();
  expect(await screen.findByText(t.portal.packageEmpty)).toBeTruthy();
  expect(screen.getByText(kid.name)).toBeTruthy();
  expect(screen.queryByText(`${t.portal.packageTab} · ${kid.name}`)).toBeNull();
  expect(asks('/package')).toBe(false);
});

test('a student the login does not hold: the empty note and no package request', async () => {
  mockAnswers['/portal/me'] = { kind: 'guardian', students: [kid], renew_url: null };
  open('someone-else');
  await show();
  expect(await screen.findByText(t.portal.packageEmpty)).toBeTruthy();
  expect(asks('/package')).toBe(false);
});
