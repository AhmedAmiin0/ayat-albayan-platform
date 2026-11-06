import { act, renderHook } from '@testing-library/react-native';
import { requestSearch } from './search-request';
import { useSearchRequest } from './use-search-request';

// The chat under the student's details after «بحث في الرسائل»: its bar opens, once.

const PHONE = '+966500000123';

test('a mounted chat opens its bar when asked, once; another chat is not', async () => {
  const open = jest.fn();
  const other = jest.fn();
  await renderHook(() => useSearchRequest(PHONE, open));
  await renderHook(() => useSearchRequest('+966500000999', other));
  expect(open).not.toHaveBeenCalled();
  await act(() => requestSearch(PHONE));
  expect(open).toHaveBeenCalledTimes(1);
  expect(other).not.toHaveBeenCalled();
});

test('asked before the chat mounts: it opens on mount, once', async () => {
  const open = jest.fn();
  requestSearch(PHONE);
  await renderHook(() => useSearchRequest(PHONE, open));
  await renderHook(() => useSearchRequest(PHONE, open));
  expect(open).toHaveBeenCalledTimes(1);
});
