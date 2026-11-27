import { fetchJoin, sendJoin } from './fetch-join';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const JOIN = { url: 'wss://lk', token: 'tok', room: 'lesson-x', role: 'teacher' };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiSend.mockResolvedValue(JOIN);
});

test.each([
  ['lesson', `/lessons/${ID}/room/join`],
  ['meeting', `/meetings/${ID}/join`],
] as const)('a %s room joins through its own route, the same paths as the web room', async (kind, path) => {
  await expect(sendJoin({ kind, id: ID })).resolves.toEqual(JOIN);
  expect(mockApiSend).toHaveBeenCalledWith('POST', path, undefined);
});

test('an answer without a known role is refused before it reaches the room', async () => {
  mockApiSend.mockResolvedValue({ ...JOIN, role: 'boss' });
  await expect(fetchJoin({ kind: 'lesson', id: ID })).rejects.toThrow();
});

test('the room keeps the token and role of the answer', async () => {
  await expect(fetchJoin({ kind: 'lesson', id: ID })).resolves.toMatchObject({
    token: 'tok',
    role: 'teacher',
  });
});
