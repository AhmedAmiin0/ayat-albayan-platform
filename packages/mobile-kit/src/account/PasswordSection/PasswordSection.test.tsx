import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '../../lib/i18n/i18n';
import { freshQueryClient, renderWithQuery } from '../../testing/query';
import { changePassword } from '../account-api';
import { PasswordSection } from './PasswordSection';

jest.mock('../account-api', () => ({ changePassword: jest.fn(async () => undefined) }));

const save = () =>
  screen.getByRole('button', { name: `${t.account.save} — ${t.account.password.title}` });
const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);

beforeEach(() => jest.mocked(changePassword).mockClear());

test('nothing typed: the save is off', async () => {
  await renderWithQuery(<PasswordSection />, freshQueryClient());
  expect(save()).toBeDisabled();
});

test('a confirmation that differs is shown under it and nothing is sent', async () => {
  await renderWithQuery(<PasswordSection />, freshQueryClient());
  await type(t.account.currentPassword, 'old-secret-1');
  await type(t.account.password.new, 'new-secret-12');
  await type(t.account.password.confirm, 'new-secret-13');
  await fireEvent.press(save());
  expect(screen.getByText(t.account.password.mismatch)).toBeTruthy();
  expect(changePassword).not.toHaveBeenCalled();
});

test('a valid change is sent, the inputs clear and the success note shows', async () => {
  await renderWithQuery(<PasswordSection />, freshQueryClient());
  await type(t.account.currentPassword, 'old-secret-1');
  await type(t.account.password.new, 'new-secret-12');
  await type(t.account.password.confirm, 'new-secret-12');
  await fireEvent.press(save());
  expect(jest.mocked(changePassword).mock.calls[0]?.[0]).toEqual({
    current_password: 'old-secret-1',
    new_password: 'new-secret-12',
  });
  expect(await screen.findByText(t.account.toast.password)).toBeTruthy();
  expect(save()).toBeDisabled();
});
