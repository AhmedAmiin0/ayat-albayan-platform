import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import { useMyProfile } from './my-profile';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('../http/api', () => ({
  ...jest.requireActual('../http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const role = { base: 'teacher', key: null, name_ar: null, name_en: null };
const profile = {
  id: '0b6f1a52-6d1e-4c43-9a37-3c5c8f1e2a10',
  full_name: 'Huda Salem',
  email: null,
  phone_e164: null,
  avatar_url: null,
  role,
};

const readProfile = () =>
  renderHook(() => useMyProfile(), { wrapper: queryWrapper(freshQueryClient()) });

beforeEach(() => jest.clearAllMocks());

test('outside a QueryClientProvider it stays idle and asks nothing', async () => {
  const { result } = await renderHook(() => useMyProfile());
  expect(result.current.fetchStatus).toBe('idle');
  expect(mockApi.reads()).toHaveLength(0);
});

test('reads GET /me/profile through its route and keeps the parsed answer', async () => {
  mockApi.onRead(() => profile);
  const { result } = await readProfile();
  await waitFor(() => expect(result.current.data).toEqual(profile));
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/me/profile' });
});

test('an answer that breaks the shared schema is an error, not data', async () => {
  mockApi.onRead(() => ({ id: 'p1', full_name: 'Huda Salem' }));
  const { result } = await readProfile();
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.data).toBeUndefined();
});
