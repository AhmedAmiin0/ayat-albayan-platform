import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { signInWithCode } from '../../sign-in';
import { CodeSignIn } from './CodeSignIn';

jest.mock('../../sign-in', () => ({ signInWithCode: jest.fn() }));

const verify = jest.mocked(signInWithCode);
const codes = { request: jest.fn(), verify: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  codes.request.mockResolvedValue(undefined);
});

async function toCodeStep() {
  await render(
    <CodeSignIn codes={codes} intro="intro words">
      <Text>other ways</Text>
    </CodeSignIn>,
  );
  expect(screen.getByText('intro words')).toBeTruthy();
  expect(screen.getByText('other ways')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.phone), '+966500000005');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.codeSent)).toBeTruthy();
}

test('the send waits for a phone; a bad phone is refused on the phone step', async () => {
  await render(<CodeSignIn codes={codes} intro="intro words" />);
  expect(screen.getByRole('button', { name: t.familyAuth.sendCode })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.phone), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByText(t.familyAuth.errors.invalid_phone)).toBeTruthy();
  expect(codes.request).not.toHaveBeenCalled();
});

test('phone → code: the typed code is verified against the number the code went to', async () => {
  verify.mockResolvedValue({ ok: false, error: t.familyAuth.errors.invalid_code });
  await toCodeStep();
  expect(codes.request).toHaveBeenCalledWith('+966500000005');
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '123456');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.verify }));
  expect(verify).toHaveBeenCalledWith({ phone: '+966500000005', code: '123456' }, codes);
  expect(await screen.findByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
});

test('an incomplete code is refused without a request', async () => {
  await toCodeStep();
  await fireEvent.changeText(screen.getByLabelText(t.familyAuth.code), '12');
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.verify }));
  expect(await screen.findByText(t.familyAuth.errors.code_incomplete)).toBeTruthy();
  expect(verify).not.toHaveBeenCalled();
});

test('«change the phone» goes back to the phone step', async () => {
  await toCodeStep();
  await fireEvent.press(screen.getByRole('button', { name: t.familyAuth.changePhone }));
  expect(screen.getByLabelText(t.familyAuth.phone)).toBeTruthy();
  expect(screen.queryByText(t.familyAuth.codeSent)).toBeNull();
});
