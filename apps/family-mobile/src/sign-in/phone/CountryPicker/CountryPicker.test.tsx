import { fireEvent, render, screen } from '@testing-library/react-native';
import { locale, t } from '@ab/mobile-kit';
import { defaultCountry, nameOf } from '@ab/client-core';
import { CountryPicker } from './CountryPicker';

const s = t.familyApp.signIn;
const saudi = defaultCountry('SA');
const egypt = defaultCountry('EG');
const onPick = jest.fn();
const onClose = jest.fn();
const show = (open = true) =>
  render(<CountryPicker open={open} current={saudi} onPick={onPick} onClose={onClose} />);
const egyptRow = () =>
  screen.getByRole('radio', { name: `${nameOf(egypt, locale)} ${egypt.dial}` });

beforeEach(() => jest.clearAllMocks());

test('open: the title, the search and the picked country ticked', async () => {
  await show();
  expect(screen.getByRole('header', { name: s.countryTitle })).toBeTruthy();
  expect(screen.getByLabelText(s.countrySearch)).toBeTruthy();
  expect(screen.getByRole('radio', { checked: true })).toBeTruthy();
});

test('closed: nothing shows', async () => {
  await show(false);
  expect(screen.queryByRole('header', { name: s.countryTitle })).toBeNull();
});

test('a search narrows the list, and one that finds nothing says so', async () => {
  await show();
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), egypt.dial);
  expect(egyptRow()).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), 'zzzz');
  expect(screen.getByText(s.countryNone)).toBeTruthy();
});

test('a pick hands the country over and clears the search', async () => {
  await show();
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), egypt.dial);
  await fireEvent.press(egyptRow());
  expect(onPick).toHaveBeenCalledWith(egypt);
  expect(screen.getByLabelText(s.countrySearch).props.value).toBe('');
});

test('the scrim closes the picker and clears the search', async () => {
  await show();
  await fireEvent.changeText(screen.getByLabelText(s.countrySearch), 'zzzz');
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText(s.countrySearch).props.value).toBe('');
});
