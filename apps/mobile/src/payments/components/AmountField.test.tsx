import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AmountField } from './AmountField';

// Arabic (jest.setup: RTL).

test('Arabic: the amount is an LTR island at the left, the caret with it', async () => {
  const onChange = jest.fn();
  await render(<AmountField value="1200" onChange={onChange} currency="SAR" />);
  const field = screen.getByLabelText(t.payments.amount);
  expect(t.payments.amount).toMatch(/[؀-ۿ]/);
  const style = StyleSheet.flatten(field.props.style);
  expect(style.direction).toBe('ltr');
  expect(style.writingDirection).toBeUndefined();
  expect(style.textAlign).toBe('left');
  await fireEvent.changeText(field, '١٥٠٠');
  expect(onChange).toHaveBeenCalledWith('١٥٠٠');
});
