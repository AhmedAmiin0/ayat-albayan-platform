import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { palette } from '@/theme';
import { Button, buttonLook, pressScale } from './Button';

const styleOf = (label: string) => StyleSheet.flatten(screen.getByRole('button', { name: label }).props.style);
const light = palette.light;

test('one height and radius for every variant: 48pt, radius md', async () => {
  await render(
    <>
      <Button label="تأكيد" onPress={jest.fn()} />
      <Button label="تغيير الموعد" variant="secondary" onPress={jest.fn()} />
      <Button label="إلغاء الحلقة" variant="danger" onPress={jest.fn()} />
      <Button label="إغلاق" variant="ghost" onPress={jest.fn()} />
    </>,
  );
  for (const label of ['تأكيد', 'تغيير الموعد', 'إلغاء الحلقة', 'إغلاق']) {
    expect(styleOf(label)).toMatchObject({ minHeight: 48, borderRadius: 8 });
  }
  expect(styleOf('تأكيد')).toMatchObject({ borderColor: 'transparent', backgroundColor: '#047857' });
  expect(styleOf('تغيير الموعد')).toMatchObject({ borderWidth: 1, borderColor: light.ruleInput });
  expect(styleOf('إغلاق')).toMatchObject({ borderWidth: 0, backgroundColor: 'transparent' });
});

test('danger is outlined in the bad tone: label and edge, never a fill', async () => {
  await render(<Button label="إلغاء الحلقة" variant="danger" onPress={jest.fn()} />);
  expect(styleOf('إلغاء الحلقة')).toMatchObject({ borderWidth: 1, borderColor: light.bad, backgroundColor: light.raised });
  expect(StyleSheet.flatten(screen.getByText('إلغاء الحلقة').props.style).color).toBe(light.bad);
  expect(buttonLook('danger', light, true).bg).toBe(light.badSoft);
  expect(buttonLook('danger', palette.dark, false).ink).toBe(palette.dark.bad);
});

test('the label is ONE line (shrinks a little before it would clip), ui 600 at body size', async () => {
  await render(<Button label="Join the lesson" onPress={jest.fn()} />);
  const text = screen.getByText('Join the lesson');
  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.adjustsFontSizeToFit).toBe(true);
  expect(StyleSheet.flatten(text.props.style)).toMatchObject({ fontFamily: 'NotoSansArabic_600SemiBold', fontSize: 15 });
});

test('a leading icon gets the label colour', async () => {
  const icon = jest.fn((c: string) => <Text>{c}</Text>);
  await render(<Button label="انسخ الرابط" variant="secondary" icon={icon} onPress={jest.fn()} />);
  expect(icon).toHaveBeenCalledWith(light.ink);
  expect(screen.getByTestId('button-icon')).toBeTruthy();
});

test('busy disables the press and is announced busy', async () => {
  const onPress = jest.fn();
  await render(<Button label="إلغاء" variant="secondary" busy onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'إلغاء' });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
  expect(StyleSheet.flatten(button.props.style).opacity).toBe(0.45);
});

test('disabled (nothing picked yet) is off but not announced busy', async () => {
  const onPress = jest.fn();
  await render(<Button label="غيّر الموعد" disabled onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'غيّر الموعد' });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: false });
});

test('the spoken name can differ from the label (a list of rows)', async () => {
  await render(<Button label="إلغاء" accessibilityLabel="إلغاء — يوسف" variant="danger" onPress={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'إلغاء — يوسف' })).toBeTruthy();
});

test('press feedback: shrinks 2% while held, never when disabled', async () => {
  expect(pressScale(true, false)).toBe(0.98);
  expect(pressScale(false, false)).toBe(1);
  expect(pressScale(true, true)).toBe(1);
  expect(buttonLook('primary', light, true).bg).toBe(light.lapisHover);
  expect(buttonLook('secondary', light, true).bg).toBe(light.sunk);
  await render(<Button label="تأكيد" onPress={jest.fn()} />);
  expect(styleOf('تأكيد').transform).toEqual([{ scale: 1 }]);
});
