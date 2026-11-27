import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteMocks } from '../mock-file.ts';

const HEAD = `const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
`;

const leftFor = (body: string, head = HEAD): string => {
  const out = rewriteMocks('a.test.ts', `${head}${body}`);
  assert.equal(out.text, `${head}${body}`);
  assert.deepEqual(
    out.found.map((f) => f.result),
    ['left'],
  );
  return out.found.map((f) => f.reason).join('');
};

test('a use with no mockCall twin leaves the file and names it', () => {
  assert.match(
    leftFor('const [m] = mockApiSend.mock.calls[0];\n'),
    /mockApiSend: mockApiSend\.mock\.calls/,
  );
  assert.match(leftFor('mockApiSend.mockResolvedValueOnce(1);\n'), /mockResolvedValueOnce/);
  assert.match(leftFor('jest.mocked(mockApiSend);\n'), /mockApiSend: jest\.mocked/);
  assert.match(leftFor('mockApiSend.mockImplementation((...a) => a);\n'), /mockImplementation/);
});

test('a factory value that is not a forwarded mock leaves the file', () => {
  const head = `jest.mock('@ab/mobile-kit/lib/http/api', () => ({ apiFetch: respond }));\n`;
  assert.match(leftFor('', head), /forwards to no mock function/);
});

test('a mock that is not declared as a mock function leaves the file', () => {
  const head = `const mockApiSend = makeSend();
jest.mock('./api', () => ({ apiSend: (...a: unknown[]) => mockApiSend(...a) }));
`;
  assert.match(leftFor('', head), /not declared as a mock function/);
});

test('a hoisted declaration of other names, or a taken mockApi, leaves the file', () => {
  const hoisted = `const { apiFetch, nav } = vi.hoisted(() => ({ apiFetch: vi.fn(), nav: vi.fn() }));
vi.mock('@ab/web-kit', async (o) => ({ ...(await o<object>()), apiFetch }));
`;
  assert.match(leftFor('', hoisted), /a declaration of other names/);
  assert.match(leftFor('const mockApi = 1;\n'), /mockApi taken/);
});

test('a file that mocks no kit module is not reported', () => {
  const text = "jest.mock('./other', () => ({ apiSend: jest.fn() }));\n";
  assert.deepEqual(rewriteMocks('a.test.ts', text), { text, found: [] });
});
