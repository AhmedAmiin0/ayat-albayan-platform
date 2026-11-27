import type { PhoneState } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ltr, t } from '@ab/mobile-kit';
import { defaultCountry } from '@ab/client-core';
import { PhoneField } from './PhoneField';

const saudi = defaultCountry('SA');
const on = { typed: jest.fn(), country: jest.fn(), submit: jest.fn() };
const show = (state: PhoneState = 'empty') =>
  render(
    <PhoneField
      country={saudi}
      typed="050"
      onTyped={on.typed}
      onCountry={on.country}
      state={state}
      onSubmit={on.submit}
    />,
  );
const field = () => screen.getByLabelText(t.familyAuth.phone);
type Node = ReturnType<typeof screen.getByLabelText>;
const edgeWidth = (node: Node | null): unknown =>
  node === null ? undefined : (node.props.style?.borderWidth ?? edgeWidth(node.parent));

beforeEach(() => jest.clearAllMocks());

test('the typed number shows and every change is handed over', async () => {
  await show();
  expect(field().props.value).toBe('050');
  await fireEvent.changeText(field(), '0500');
  expect(on.typed).toHaveBeenCalledWith('0500');
});

test('the country button opens the picker; the keyboard send submits', async () => {
  await show();
  await fireEvent.press(screen.getByText(ltr(saudi.dial)));
  expect(on.country).toHaveBeenCalledTimes(1);
  await fireEvent(field(), 'submitEditing');
  expect(on.submit).toHaveBeenCalledTimes(1);
});

test('focus thickens the edge and blur returns it', async () => {
  await show();
  const width = () => edgeWidth(field());
  expect(width()).toBe(1);
  await fireEvent(field(), 'focus');
  expect(width()).toBe(2);
  await fireEvent(field(), 'blur');
  expect(width()).toBe(1);
});
