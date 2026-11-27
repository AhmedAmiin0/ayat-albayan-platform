import { PUBLIC_CONFIG_PATH, PUBLIC_SETTING_DEFAULTS } from '@ab/settings';
import { screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { student } from '@/portal/portal.fixtures';
import { ChildScreen } from './ChildScreen';

const mockFetch = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const kid = student();
const READS: Record<string, unknown> = {
  '/portal/me': { kind: 'guardian', students: [kid], renew_url: null },
  [PUBLIC_CONFIG_PATH]: { ...PUBLIC_SETTING_DEFAULTS, custom: {} },
};
const open = (id: string) => jest.mocked(useLocalSearchParams).mockReturnValue({ id });
const show = () => renderWithQuery(<ChildScreen />, freshQueryClient());

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockImplementation(async (path: string) => READS[path.split('?')[0] ?? ''] ?? null);
});

test("a linked child: the name and code in the header, then the child's tabs", async () => {
  open(kid.id);
  await show();
  expect(await screen.findByText(kid.name)).toBeTruthy();
  expect(screen.getByText(kid.code)).toBeTruthy();
  expect(await screen.findByRole('tab', { name: t.portal.attendedTab })).toBeTruthy();
});

test('an id this login does not hold: the page title and the «not linked» note', async () => {
  open('someone-else');
  await show();
  expect(await screen.findByText(t.portal.noStudents)).toBeTruthy();
  expect(screen.getByText(t.familyApp.child.title)).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
});
