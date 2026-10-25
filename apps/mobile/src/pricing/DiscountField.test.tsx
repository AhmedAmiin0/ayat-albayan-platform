import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { DiscountField } from './DiscountField';

test('shows the typed discount and hands every edit back as text', async () => {
  const onChange = jest.fn();
  await render(<DiscountField value="7" onChange={onChange} />);
  const field = screen.getByLabelText(t.pricing.steps.discount);
  expect(field.props.value).toBe('7');
  expect(field.props.keyboardType).toBe('decimal-pad');
  await fireEvent.changeText(field, '١٢٫٥');
  expect(onChange).toHaveBeenCalledWith('١٢٫٥');
});
