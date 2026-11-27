import type { PhoneState } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { locale, t } from '@ab/mobile-kit';
import { defaultCountry, nameOf } from '@ab/client-core';
import type { PhoneStepProps } from './PhoneStep.types';
import { PhoneStep } from './PhoneStep';

const s = t.familyApp.signIn;
const saudi = defaultCountry('SA');
const egypt = defaultCountry('EG');
const phone = { setCountry: jest.fn(), setTyped: jest.fn() };
const send = jest.fn(async () => undefined);
const signOf = (
  state: PhoneState,
  flow: { busy: boolean; error: string | null },
): PhoneStepProps['sign'] => ({
  flow,
  phone: { ...phone, country: saudi, typed: '050', check: { state, e164: null } },
  send,
});
const show = (state: PhoneState, flow = { busy: false, error: null as string | null }) =>
  render(<PhoneStep sign={signOf(state, flow)} />);
const sendButton = () => screen.getByRole('button', { name: t.familyAuth.sendCode });

beforeEach(() => jest.clearAllMocks());

test('a whole number: the quiet hint and an open send button that sends', async () => {
  await show('ok');
  expect(screen.getByText(s.phoneHint)).toBeTruthy();
  await fireEvent.press(sendButton());
  expect(send).toHaveBeenCalledTimes(1);
});

test('a wrong number: the bad hint and a held send button', async () => {
  await show('bad');
  expect(screen.getByText(s.phoneBad)).toBeTruthy();
  expect(sendButton()).toBeDisabled();
});

test('a refused send shows its words; a busy one says it is sending', async () => {
  await show('ok', { busy: false, error: 'refused' });
  expect(screen.getByText('refused')).toBeTruthy();
  await show('ok', { busy: true, error: null });
  expect(screen.getByRole('button', { name: t.familyAuth.sending })).toBeTruthy();
});

test('the country button opens the picker; a pick sets the country and closes it', async () => {
  await show('typing');
  expect(screen.queryByRole('header', { name: s.countryTitle })).toBeNull();
  await fireEvent.press(screen.getByText(saudi.dial, { exact: false }));
  expect(screen.getByRole('header', { name: s.countryTitle })).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), egypt.dial);
  await fireEvent.press(
    screen.getByRole('radio', { name: `${nameOf(egypt, locale)} ${egypt.dial}` }),
  );
  expect(phone.setCountry).toHaveBeenCalledWith(egypt);
  expect(screen.queryByRole('header', { name: s.countryTitle })).toBeNull();
});
