import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Checkbox } from '../Checkbox';

async function setup(props: { checked?: boolean; disabled?: boolean } = {}) {
  const onChange = jest.fn();
  await render(
    <Checkbox
      label="الحلقة"
      hint="تلميح"
      checked={props.checked ?? false}
      disabled={props.disabled}
      onChange={onChange}
    >
      <Text>صف</Text>
    </Checkbox>,
  );
  return onChange;
}

test('one named checkbox, unchecked: a press reports checked', async () => {
  const onChange = await setup();
  const box = screen.getByRole('checkbox', { name: 'الحلقة' });
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(box.props.accessibilityState).toEqual({ checked: false });
  expect(box.props.accessibilityHint).toBe('تلميح');
  await fireEvent.press(box);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('checked: the state is spoken and a press reports unchecked', async () => {
  const onChange = await setup({ checked: true });
  const box = screen.getByRole('checkbox', { checked: true });
  await fireEvent.press(box);
  expect(onChange).toHaveBeenCalledWith(false);
});

test('disabled: the state is spoken and a press does nothing', async () => {
  const onChange = await setup({ checked: true, disabled: true });
  const box = screen.getByRole('checkbox', { disabled: true });
  await fireEvent.press(box);
  expect(onChange).not.toHaveBeenCalled();
});

test('the row content sits inside the one touch target', async () => {
  await setup();
  expect(screen.getByRole('checkbox')).toHaveTextContent('صف');
});
