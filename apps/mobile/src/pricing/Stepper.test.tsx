import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Stepper } from './Stepper';

const label = t.pricing.studentsLabel;

test('أقل / أكثر step by one and the value reads in Western digits', async () => {
  const onChange = jest.fn();
  await render(<Stepper label={label} value={3} min={1} max={20} onChange={onChange} />);
  expect(screen.getByText(ltr('3'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.pricing.increase }));
  expect(onChange).toHaveBeenLastCalledWith(4);
  await fireEvent.press(screen.getByRole('button', { name: t.pricing.decrease }));
  expect(onChange).toHaveBeenLastCalledWith(2);
});

test('at the limits the button is disabled and nothing changes', async () => {
  const onChange = jest.fn();
  const { rerender } = await render(
    <Stepper label={label} value={1} min={1} max={20} onChange={onChange} />,
  );
  const less = screen.getByRole('button', { name: t.pricing.decrease });
  expect(less.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(less);
  await rerender(<Stepper label={label} value={20} min={1} max={20} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: t.pricing.increase }));
  expect(onChange).not.toHaveBeenCalled();
});
