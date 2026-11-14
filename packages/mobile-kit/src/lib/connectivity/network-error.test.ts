import { ApiError } from '../http/api';
import { isNetworkError } from './network-error';

test('only a fetch with no response is a network error', () => {
  expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  expect(isNetworkError(new ApiError(500))).toBe(false);
  expect(isNetworkError(Object.assign(new Error('Aborted'), { name: 'AbortError' }))).toBe(false);
});
