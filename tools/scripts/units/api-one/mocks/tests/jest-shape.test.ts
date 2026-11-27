import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteMocks } from '../mock-file.ts';

const BEFORE = `import { render } from '@testing-library/react-native';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

beforeEach(() => mockApiFetch.mockImplementation(async (path: string) => ({ path })));

test('x', async () => {
  mockApiSend.mockImplementation((m: string, p: string) => Promise.resolve({ m, p }));
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/a/1', expect.objectContaining({ s: 1 }));
  expect(mockApiFetch).not.toHaveBeenCalledWith('/b');
  mockApiFetch.mockClear();
});
`;

const AFTER = `import { render } from '@testing-library/react-native';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => mockApi.onRead(async ({ path }) => ({ path })));

test('x', async () => {
  mockApi.onWrite(({ method: m, path: p }) => Promise.resolve({ m, p }));
  expect(mockApi.writes()).toContainEqual({ method: 'PATCH', path: '/a/1', body: expect.objectContaining({ s: 1 }) });
  expect(mockApi.reads()).not.toContainEqual({ method: 'GET', path: '/b' });
  mockApi.clear('read');
});
`;

test('jest forwarding mocks of the kit module move to mockCall', () => {
  const out = rewriteMocks('a.test.tsx', BEFORE);
  assert.deepEqual(out.found, [{ line: 5, result: 'rewritten', reason: 'mocks' }]);
  assert.equal(out.text, AFTER);
});

test('a second run changes nothing', () => {
  assert.deepEqual(rewriteMocks('a.test.tsx', AFTER), { text: AFTER, found: [] });
});
