import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteMocks } from '../mock-file.ts';

const BEFORE = `import { render } from '@testing-library/react-native';

jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: async () => ({ id: 'u1' }),
  apiSend: jest.fn(),
}));
`;

const AFTER = `import { render } from '@testing-library/react-native';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
mockApi.onRead(async () => ({ id: 'u1' }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
`;

test('a factory that answers by itself becomes a handler; a bare jest.fn() answers nothing', () => {
  assert.equal(rewriteMocks('a.test.tsx', BEFORE).text, AFTER);
  assert.deepEqual(rewriteMocks('a.test.tsx', AFTER).found, []);
});

test('an inline mock whose name the test also uses leaves the file', () => {
  const text = `${BEFORE}import { apiSend } from '@ab/mobile-kit/lib/http/api';\njest.mocked(apiSend);\n`;
  assert.match(rewriteMocks('a.test.tsx', text).found[0]?.reason ?? '', /also used by name/);
});

test('a forwarder cast `as unknown` and a reset chained to a setter are moved', () => {
  const text = `const mockApiFetch = jest.fn();
jest.mock('./api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) as unknown }));
beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue([]);
});
`;
  const out = rewriteMocks('a.test.ts', text).text;
  assert.match(out, /mockApi\.reset\('read'\); mockApi\.onRead\(\(\) => \[\]\);/);
  assert.match(out, /call: \(request: unknown\) => mockApi\.call\(request\)/);
});
