import { renderHook, waitFor } from '@testing-library/react-native';
import { pathKey } from '@ab/client-core';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import { apiFetch } from '../http/api';
import { followProfileLocale } from './profile-locale';
import { useProfileLocaleSync } from './use-profile-locale-sync';

// After sign-in the live /auth/me `locale` drives the switch; the persisted copy never does.
jest.mock('./profile-locale', () => ({ followProfileLocale: jest.fn(async () => false) }));
jest.mock('../http/api', () => ({ apiFetch: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('signed in: the live answer’s locale is followed', async () => {
  jest.mocked(apiFetch).mockResolvedValue({ id: 'u1', locale: 'en' });
  const wrapper = queryWrapper(freshQueryClient());
  await renderHook(() => useProfileLocaleSync(true), { wrapper });
  await waitFor(() => expect(followProfileLocale).toHaveBeenLastCalledWith('en'));
  expect(apiFetch).toHaveBeenCalledWith('/auth/me');
});

test('a restored copy alone (before the live answer) is not followed', async () => {
  jest.mocked(apiFetch).mockReturnValue(new Promise(() => undefined)); // no live answer
  const client = freshQueryClient();
  client.setQueryData(pathKey('/auth/me'), { id: 'u1', locale: 'en' });
  await renderHook(() => useProfileLocaleSync(true), { wrapper: queryWrapper(client) });
  expect(followProfileLocale).toHaveBeenLastCalledWith(null);
});

test('signed out: no fetch, nothing to follow', async () => {
  const wrapper = queryWrapper(freshQueryClient());
  await renderHook(() => useProfileLocaleSync(false), { wrapper });
  expect(apiFetch).not.toHaveBeenCalled();
  expect(followProfileLocale).toHaveBeenLastCalledWith(null);
});
