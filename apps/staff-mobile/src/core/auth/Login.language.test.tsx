import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { setLocale, t } from '@ab/mobile-kit';
import Login from '../../../app/login';
import { mockCall } from '@ab/testing/mock-call';

// LoginStaff board: the same compact «English» the family sign-in has, under the sign-in.
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('@ab/mobile-kit/lib/i18n/locale-switch', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/i18n/locale-switch'),
  setLocale: jest.fn(async () => 'reloading'),
}));

beforeEach(() => jest.clearAllMocks());

test('the other language by its own name, no «اللغة» heading; one confirm, then the switch', async () => {
  mockApi.onRead(() => ({ available: false, staff: false }));
  await render(<Login />);
  expect(screen.queryByRole('header', { name: t.language.label })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.language.en }));
  expect(screen.getByText(t.language.restart)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
  await waitFor(() => expect(setLocale).toHaveBeenCalledWith('en'));
});
