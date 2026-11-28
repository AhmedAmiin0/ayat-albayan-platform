import { fireEvent, render, screen } from '@testing-library/react-native';
import { AppText } from '../../../primitives/AppText';
import { SwitchRow } from '../SwitchRow';

test('the label names the switch; a flip reports the new value; the note sits under it', async () => {
  const onChange = jest.fn();
  await render(
    <SwitchRow label="الإشعارات" value onChange={onChange}>
      <AppText>ملاحظة</AppText>
    </SwitchRow>,
  );
  const control = screen.getByLabelText('الإشعارات');
  expect(control.props.value).toBe(true);
  await fireEvent(control, 'valueChange', false);
  expect(onChange).toHaveBeenCalledWith(false);
  expect(screen.getByText('ملاحظة')).toBeTruthy();
});

test('disabled while busy', async () => {
  await render(<SwitchRow label="x" value={false} disabled onChange={jest.fn()} />);
  expect(screen.getByLabelText('x').props.disabled).toBe(true);
});
