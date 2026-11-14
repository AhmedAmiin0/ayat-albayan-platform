import { connectivity } from '../connectivity/connectivity';
import { ApiError, apiFetch } from './api';

// apiFetch tells the connection state what happened (jest.setup.cjs gives a still store with spies).
jest.mock('./env', () => ({ env: { apiUrl: 'http://api' } }));

const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  jest.mocked(connectivity.reportFailure).mockClear();
  jest.mocked(connectivity.reportReached).mockClear();
});

test('no response at all reports a network failure and still throws it', async () => {
  mockFetch.mockRejectedValue(new TypeError('Network request failed'));
  await expect(apiFetch('/today')).rejects.toBeInstanceOf(TypeError);
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(1);
  expect(connectivity.reportReached).not.toHaveBeenCalled();
});

test('an HTTP 500 is an answer: reached, never offline', async () => {
  mockFetch.mockResolvedValue(new Response(null, { status: 500 }));
  await expect(apiFetch('/today')).rejects.toBeInstanceOf(ApiError);
  expect(connectivity.reportReached).toHaveBeenCalledTimes(1);
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
});

test('a cancelled request (AbortError) is not offline', async () => {
  mockFetch.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
  await expect(apiFetch('/today')).rejects.toThrow('Aborted');
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
});
