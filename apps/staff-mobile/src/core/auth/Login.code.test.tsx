import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import Login from '../../../app/login';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => jest.clearAllMocks());

test('«الدخول برمز واتساب» shows while staff codes can be sent, and opens the phone step (docs/46 A8)', async () => {
  mockApi.onRead(() => ({ available: false, staff: true }));
  await render(<Login />);
  await fireEvent.press(await screen.findByRole('button', { name: t.teacherAuth.withCode }));
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
  expect(screen.queryByLabelText(t.auth.password)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.teacherAuth.withPassword }));
  expect(screen.getByLabelText(t.auth.password)).toBeTruthy();
});

test('no link while staff codes are off or the status fails', async () => {
  mockApi.onRead(() => Promise.reject(new TypeError('Network request failed')));
  await render(<Login />);
  expect(await screen.findByRole('button', { name: t.familyAuth.forgot })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.teacherAuth.withCode })).toBeNull();
});
