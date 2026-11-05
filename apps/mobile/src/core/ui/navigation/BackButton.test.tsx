import { fireEvent, render, screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { BackButton } from './BackButton';

const chevronScale = () => {
  const node = screen.getByTestId('chevron-prev', { includeHiddenElements: true });
  const style = StyleSheet.flatten(node.props.style);
  return (style.transform as { scaleX: number }[])[0]?.scaleX;
};

afterEach(() => {
  Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true });
});

test('an icon button named «رجوع», 44pt, that calls onPress', async () => {
  const onPress = jest.fn();
  await render(<BackButton onPress={onPress} />);
  const button = screen.getByRole('button', { name: t.common.back });
  expect(button).toHaveStyle({ width: 44, height: 44 });
  expect(screen.queryByText(t.common.back)).toBeNull();
  fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('RTL: the chevron points right (the inline-start); LTR: left', async () => {
  Object.defineProperty(I18nManager, 'isRTL', { value: true, configurable: true });
  const first = await render(<BackButton onPress={jest.fn()} />);
  expect(chevronScale()).toBe(-1);
  first.unmount();
  Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true });
  await render(<BackButton onPress={jest.fn()} />);
  expect(chevronScale()).toBe(1);
});

test('busy or disabled: not pressable', async () => {
  const onPress = jest.fn();
  await render(<BackButton onPress={onPress} busy />);
  const button = screen.getByRole('button', { name: t.common.back });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});
