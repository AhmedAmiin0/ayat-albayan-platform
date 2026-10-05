import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Button } from './Button';

const styleOf = (label: string) => StyleSheet.flatten(screen.getByRole('button', { name: label }).props.style);

test('secondary has the input edge, primary is a plain green fill, ghost has none', async () => {
  await render(
    <>
      <Button label="تأكيد" onPress={jest.fn()} />
      <Button label="إلغاء" variant="secondary" onPress={jest.fn()} />
      <Button label="خروج" variant="ghost" onPress={jest.fn()} />
    </>,
  );
  expect(styleOf('إلغاء')).toMatchObject({ borderWidth: 1, minHeight: 44 });
  expect(styleOf('تأكيد')).toMatchObject({ borderColor: 'transparent', backgroundColor: '#047857' });
  expect(styleOf('خروج').borderWidth).toBe(0);
  expect(styleOf('خروج').backgroundColor).toBe('transparent');
});

test('busy disables the press', async () => {
  const onPress = jest.fn();
  await render(<Button label="إلغاء" variant="secondary" busy onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
  expect(onPress).not.toHaveBeenCalled();
});

test('disabled (nothing picked yet) is off but not announced busy', async () => {
  const onPress = jest.fn();
  await render(<Button label="غيّر الموعد" disabled onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'غيّر الموعد' });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: false });
});
