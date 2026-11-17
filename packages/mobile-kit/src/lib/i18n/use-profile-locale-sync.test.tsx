import { renderHook } from '@testing-library/react-native';
import { pathKey } from '@ab/client-core';
import { act } from 'react';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import { followProfileLocale } from './profile-locale';
import { useProfileLocaleSync } from './use-profile-locale-sync';

// After sign-in a live /auth/me `locale` drives the switch; a restored or seeded copy never does.
jest.mock('./profile-locale', () => ({ followProfileLocale: jest.fn(async () => false) }));

const ME = pathKey('/auth/me');
const live = (locale: string) => async () => ({ id: 'u1', locale });

beforeEach(() => jest.clearAllMocks());

test('signed in: a live answer’s locale is followed', async () => {
  const client = freshQueryClient();
  await renderHook(() => useProfileLocaleSync(true), { wrapper: queryWrapper(client) });
  await act(() => client.query({ queryKey: ME, queryFn: live('en') }));
  expect(followProfileLocale).toHaveBeenCalledWith('en');
});

test('a restored or seeded copy is not followed, nor another query', async () => {
  const client = freshQueryClient();
  await renderHook(() => useProfileLocaleSync(true), { wrapper: queryWrapper(client) });
  await act(async () => void client.setQueryData(ME, { id: 'u1', locale: 'en' }));
  await act(() => client.query({ queryKey: pathKey('/other'), queryFn: live('en') }));
  expect(followProfileLocale).not.toHaveBeenCalled();
});

test('signed out: nothing is followed', async () => {
  const client = freshQueryClient();
  await renderHook(() => useProfileLocaleSync(false), { wrapper: queryWrapper(client) });
  await act(() => client.query({ queryKey: ME, queryFn: live('en') }));
  expect(followProfileLocale).not.toHaveBeenCalled();
});
