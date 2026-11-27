import { changePassword } from './account-api';

const mockApiSend = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const body = { current_password: 'old-secret', new_password: 'new-secret-1' };

beforeEach(() => jest.clearAllMocks());

test('PUT /me/password through its route object, with no answer body', async () => {
  mockApiSend.mockResolvedValue(undefined);
  await expect(changePassword(body)).resolves.toBeUndefined();
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/me/password', body);
});

test('an answer with a body breaks the route and is refused', async () => {
  mockApiSend.mockResolvedValue({ ok: true });
  await expect(changePassword(body)).rejects.toThrow();
});

test('a refusal is passed on to the form', async () => {
  mockApiSend.mockRejectedValue(new Error('wrong_password'));
  await expect(changePassword(body)).rejects.toThrow('wrong_password');
});
