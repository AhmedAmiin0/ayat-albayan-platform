import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, Text } from 'react-native';
import { palette } from '../../../../theme';
import { Checkbox } from '../Checkbox.android';

const setRtl = (value: boolean) =>
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true });

afterEach(() => setRtl(false));

const box = () => screen.getByTestId('checkbox-box', { includeHiddenElements: true });

async function setup(props: { checked?: boolean; disabled?: boolean } = {}) {
  const onChange = jest.fn();
  await render(
    <Checkbox
      label="الحلقة"
      checked={props.checked ?? false}
      disabled={props.disabled}
      onChange={onChange}
      testID="row"
    >
      <Text>صف</Text>
    </Checkbox>,
  );
  return onChange;
}

test('a Material box drawn for the one named row: a press on the row reports checked', async () => {
  const onChange = await setup();
  expect(box().props.compose).toBe(true);
  expect(box().props.value).toBe(false);
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  const row = screen.getByRole('checkbox', { name: 'الحلقة' });
  expect(row).toHaveTextContent('صف');
  expect(screen.getByTestId('row')).toBe(row);
  await fireEvent.press(row);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('the box only draws: it has no callback, so the row alone reports a press', async () => {
  await setup({ checked: true });
  expect(box().props.value).toBe(true);
  expect(box().props.onCheckedChange).toBeUndefined();
});

test('disabled: spoken on the row, and a press does nothing', async () => {
  const onChange = await setup({ checked: true, disabled: true });
  await fireEvent.press(screen.getByRole('checkbox', { disabled: true }));
  expect(onChange).not.toHaveBeenCalled();
});

test('the brand fill when checked, the input rule when not, the tick on the fill', async () => {
  await setup({ checked: true });
  const { colors } = box().props;
  expect(colors.checkedColor).toBe(palette.light.lapisFill);
  expect(colors.uncheckedColor).toBe(palette.light.ruleInput);
  expect(colors.checkmarkColor).toBe(palette.light.onLapis);
});

test('the box sits in the kit host, in the app direction', async () => {
  setRtl(true);
  await setup();
  const host = screen.getByTestId('checkbox-host', { includeHiddenElements: true });
  expect(host.props.layoutDirection).toBe('rightToLeft');
});
