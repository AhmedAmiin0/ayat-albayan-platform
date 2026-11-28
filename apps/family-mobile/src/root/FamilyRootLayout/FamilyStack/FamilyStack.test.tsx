import { act, renderRouter, screen } from 'expo-router/testing-library';
import { queryClient, t } from '@ab/mobile-kit';
import Layout from '../../../../app/_layout';
import Login from '../../../../app/login';

// The startup is interactive once the first screen is whole (useFamilyStack `ready`): signed out,
// that waits for the sign-in codes, so the marker must not mount before they are known.

const mockApiFetch = jest.fn();
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('@ab/mobile-kit/auth/use-auth-gate', () => ({ useAuthGate: () => 'out' }));

const MARKER = 'observe-interactive';

/** Opens signed out with GET /auth/code/status held until the returned release is called. */
function openWithHeldCodes() {
  const codes = Promise.withResolvers<unknown>();
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/auth/code/status' ? codes.promise : {},
  );
  const routes = { _layout: Layout, login: Login, index: () => null };
  const release = () => codes.resolve({ available: true, staff: false });
  return { router: renderRouter(routes, { initialUrl: '/login' }), release };
}

beforeEach(() => queryClient.clear());

test('no interactive mark while the first screen is not ready', async () => {
  const { router } = openWithHeldCodes();
  await router;
  expect(screen.queryByTestId(MARKER)).toBeNull();
  expect(screen.queryByText(t.familyApp.signIn.withPassword)).toBeNull();
});

test('the mark comes once with the whole sign-in screen', async () => {
  const { router, release } = openWithHeldCodes();
  await router;
  await act(async () => release());
  expect(await screen.findByText(t.familyApp.signIn.withPassword)).toBeTruthy();
  expect(screen.getAllByTestId(MARKER)).toHaveLength(1);
});
