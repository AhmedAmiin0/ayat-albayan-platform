import { confirmReplyLesson } from './reply-confirm-api';

const mockSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...a: unknown[]) => mockSend(...a),
}));

const ID = 'a1000000-0000-4000-8000-000000000002';
const MOVED = { id: ID, starts_at: '2099-10-04T14:00:00.000Z', status: 'confirmed' };

beforeEach(() => mockSend.mockReset());

test.each([
  ['sales', `/sales/lessons/${ID}/confirm`],
  ['admin', `/lessons/${ID}/confirm`],
] as const)('%s confirms on its own route', async (route, path) => {
  mockSend.mockResolvedValue({});
  await expect(confirmReplyLesson({ lessonId: ID, route })).rejects.toThrow();
  expect(mockSend).toHaveBeenCalledWith('POST', path, undefined);
});

test('sales gets the moved lesson back, parsed strictly', async () => {
  mockSend.mockResolvedValue(MOVED);
  await expect(confirmReplyLesson({ lessonId: ID, route: 'sales' })).resolves.toEqual(MOVED);
});
