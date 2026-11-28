import { changePassword } from './account-api';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const body = { current_password: 'old-secret', new_password: 'new-secret-1' };

beforeEach(() => jest.clearAllMocks());

test('PUT /me/password through its route object, with no answer body', async () => {
  mockApi.onWrite(() => undefined);
  await expect(changePassword(body)).resolves.toBeUndefined();
  expect(mockApi.writes()).toContainEqual({ method: 'PUT', path: '/me/password', body: body });
});

test('an answer with a body breaks the route and is refused', async () => {
  mockApi.onWrite(() => ({ ok: true }));
  await expect(changePassword(body)).rejects.toThrow();
});

test('a refusal is passed on to the form', async () => {
  mockApi.onWrite(() => Promise.reject(new Error('wrong_password')));
  await expect(changePassword(body)).rejects.toThrow('wrong_password');
});
