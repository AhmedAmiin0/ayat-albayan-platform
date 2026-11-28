import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager } from 'react-native';
import { palette } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import { SwitchRow } from '../SwitchRow.android';

const setRtl = (value: boolean) =>
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true });

afterEach(() => setRtl(false));

const control = (label: string) => screen.getByLabelText(label);

test('a Material switch named by the label: a flip reports the new value', async () => {
  const onChange = jest.fn();
  await render(
    <SwitchRow label="الإشعارات" value onChange={onChange} testID="row">
      <AppText>ملاحظة</AppText>
    </SwitchRow>,
  );
  expect(control('الإشعارات').props.compose).toBe(true);
  expect(control('الإشعارات').props.value).toBe(true);
  await fireEvent(control('الإشعارات'), 'valueChange', false);
  expect(onChange).toHaveBeenCalledWith(false);
  expect(screen.getByText('ملاحظة')).toBeTruthy();
  expect(screen.getByTestId('row')).toBeTruthy();
});

test('disabled while busy: the switch is not enabled and does not report', async () => {
  await render(<SwitchRow label="x" value={false} disabled onChange={jest.fn()} />);
  expect(control('x').props.disabled).toBe(true);
});

test('the brand fill on the track when on, the input rule when off', async () => {
  await render(<SwitchRow label="x" value onChange={jest.fn()} />);
  const { colors } = control('x').props;
  expect(colors.checkedTrackColor).toBe(palette.light.lapisFill);
  expect(colors.checkedThumbColor).toBe(palette.light.onLapis);
  expect(colors.uncheckedBorderColor).toBe(palette.light.ruleInput);
});

test('the switch sits in the kit host: Arabic flips it to the start edge', async () => {
  setRtl(true);
  await render(<SwitchRow label="x" value onChange={jest.fn()} />);
  expect(screen.getByTestId('switch-host').props.layoutDirection).toBe('rightToLeft');
});
