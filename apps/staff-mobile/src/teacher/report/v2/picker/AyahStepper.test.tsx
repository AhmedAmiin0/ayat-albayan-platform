import { fireEvent, render, screen } from '@testing-library/react-native';
import { AyahStepper } from './AyahStepper';

const LABEL = 'إلى الآية';

it('typed digits apply when editing ends, not on each keystroke; an empty field falls back', async () => {
  const onChange = jest.fn();
  await render(<AyahStepper label={LABEL} value={22} onChange={onChange} />);
  const input = screen.getByDisplayValue('22');
  await fireEvent.changeText(input, '2');
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.changeText(input, '25');
  await fireEvent(input, 'endEditing');
  expect(onChange).toHaveBeenCalledWith(25);
  await fireEvent.changeText(input, '');
  await fireEvent(input, 'endEditing');
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue('22')).toBeTruthy();
});
