import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { setLoginNotice } from '../../login-notice';
import { signIn } from '../../sign-in';
import { PasswordSignIn } from './PasswordSignIn';

jest.mock('../../sign-in', () => ({ signIn: jest.fn() }));

const mockSignIn = jest.mocked(signIn);
const label = 'username';

beforeEach(() => {
  jest.clearAllMocks();
  setLoginNotice(null);
});

async function submit(identifier: string) {
  await fireEvent.changeText(screen.getByLabelText(label), identifier);
  await fireEvent.changeText(screen.getByLabelText(t.auth.password), 'secret');
  await fireEvent.press(screen.getByRole('button', { name: t.auth.submit }));
}

test('signs in with the trimmed identifier and reports the result', async () => {
  mockSignIn.mockResolvedValue({ ok: true });
  const onResult = jest.fn();
  await render(<PasswordSignIn label={label} onResult={onResult} />);
  await submit(' sara.t ');
  expect(mockSignIn).toHaveBeenCalledWith({ identifier: 'sara.t', password: 'secret' });
  expect(onResult).toHaveBeenCalledWith(true);
  expect(screen.getByRole('button', { name: t.auth.submitting })).toBeBusy();
});

test('a refusal shows in the alert and the form is usable again', async () => {
  mockSignIn.mockResolvedValue({ ok: false, error: 'refused words' });
  await render(<PasswordSignIn label={label} />);
  await submit('sara.t');
  expect(await screen.findByText('refused words')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.auth.submit })).not.toBeBusy();
});

test('the hint shows under the identifier; a failed check replaces it and holds the button', async () => {
  const check = (typed: string) => (typed.includes(' ') ? 'no spaces' : null);
  await render(<PasswordSignIn label={label} hint="quiet hint" check={check} />);
  expect(screen.getByText('quiet hint')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(label), 'sara t');
  expect(screen.getByText('no spaces')).toBeTruthy();
  expect(screen.queryByText('quiet hint')).toBeNull();
  expect(screen.getByRole('button', { name: t.auth.submit })).toBeDisabled();
});

test('why the last session ended shows before any try', async () => {
  setLoginNotice('accountDisabled');
  await render(<PasswordSignIn label={label} />);
  expect(screen.getByText(t.mobileNav.accountDisabled)).toBeTruthy();
});
