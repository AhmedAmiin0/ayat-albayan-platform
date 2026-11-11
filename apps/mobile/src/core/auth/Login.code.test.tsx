import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import Login from '../../../app/login';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

beforeEach(() => jest.clearAllMocks());

test('«الدخول برمز واتساب» shows while staff codes can be sent, and opens the phone step (docs/46 A8)', async () => {
  mockApiFetch.mockResolvedValue({ available: false, staff: true });
  await render(<Login />);
  await fireEvent.press(await screen.findByRole('button', { name: t.teacherAuth.withCode }));
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
  expect(screen.queryByLabelText(t.auth.password)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.teacherAuth.withPassword }));
  expect(screen.getByLabelText(t.auth.password)).toBeTruthy();
});

test('no link while staff codes are off or the status fails', async () => {
  mockApiFetch.mockRejectedValue(new TypeError('Network request failed'));
  await render(<Login />);
  expect(await screen.findByRole('button', { name: t.familyAuth.forgot })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.teacherAuth.withCode })).toBeNull();
});
