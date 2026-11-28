import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { palette, shape } from '../../../../theme';
import { Field } from '../Field';

const input = () => screen.getByLabelText(t.auth.email);

test('a plain field is the @expo/ui text input, named by its label', async () => {
  await render(<Field label={t.auth.email} value="a@b.c" />);
  expect(input()).toHaveProp('expoUi', true);
  expect(input()).toHaveDisplayValue('a@b.c');
});

test('the label also names it for TalkBack, with the required hint after it', async () => {
  await render(<Field label={t.auth.email} required value="" />);
  expect(input()).toHaveProp('accessibilityHint', t.common.required);
  expect(input().props.modifiers).toContainEqual({
    $type: 'semantics',
    params: { contentDescription: `${t.auth.email}. ${t.common.required}` },
  });
});

test('the keyboard and autofill props reach the native input', async () => {
  const props = {
    keyboardType: 'number-pad',
    autoCapitalize: 'none',
    autoCorrect: false,
    autoComplete: 'sms-otp',
    returnKeyType: 'done',
    inputMode: 'numeric',
    maxLength: 12,
    editable: false,
    autoFocus: true,
    multiline: true,
    placeholder: '123',
    testID: 'code',
  } as const;
  await render(<Field label={t.auth.email} value="" {...props} />);
  expect(input().props).toMatchObject(props);
  expect(input()).toHaveProp('placeholderTextColor', palette.light.ink3);
});

test('the return key calls onSubmitEditing, focus and blur call theirs', async () => {
  const onSubmitEditing = jest.fn();
  const onFocus = jest.fn();
  const onBlur = jest.fn();
  await render(<Field label={t.auth.email} value="" {...{ onSubmitEditing, onFocus, onBlur }} />);
  await fireEvent(input(), 'submitEditing');
  await fireEvent(input(), 'focus');
  await fireEvent(input(), 'blur');
  expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  expect(onFocus).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
});

test('focus turns the 1pt rule edge into a 2pt lapis ring on the same box', async () => {
  await render(<Field label={t.auth.email} value="" />);
  const edge = { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 };
  expect(input().props.style).toMatchObject({ ...edge, borderColor: palette.light.ruleInput });
  await fireEvent(input(), 'focus');
  const ring = { borderWidth: 2, paddingVertical: 7, paddingHorizontal: 11 };
  expect(input().props.style).toMatchObject({ ...ring, borderColor: palette.light.lapis });
});

test('the box is at least the 44pt touch size on both platforms', async () => {
  await render(<Field label={t.auth.email} value="" />);
  const mods = input().props.modifiers;
  const touch = { minHeight: shape.control.touch };
  expect(mods).toContainEqual({ $type: 'defaultMinSize', params: touch });
  // SwiftUI frames the text inside the padding and edge: 44 - 2 × (8 + 1).
  expect(mods).toContainEqual({ $type: 'frame', params: { minHeight: 26 } });
});

test('typing reports the text; a new value from the screen replaces the native text', async () => {
  const onChangeText = jest.fn();
  const view = await render(<Field label={t.auth.email} value="a" onChangeText={onChangeText} />);
  await fireEvent.changeText(input(), 'ab');
  expect(onChangeText).toHaveBeenCalledWith('ab');
  const reset = <Field label={t.auth.email} value="" onChangeText={onChangeText} />;
  await act(() => view.rerender(reset));
  expect(input()).toHaveDisplayValue('');
});

test('an ltr field lays its native host out left to right', async () => {
  await render(<Field label={t.auth.email} ltr value="a@b.c" />);
  expect(screen.getByTestId('native-host')).toHaveProp('layoutDirection', 'leftToRight');
});

test('a free-text field keeps the UI direction on its host', async () => {
  await render(<Field label={t.auth.email} value="سلام" />);
  expect(screen.getByTestId('native-host').props.layoutDirection).toBeUndefined();
});

function DigitsOnly() {
  const [code, setCode] = useState('');
  const onChangeText = (v: string) => setCode(v.replace(/\D/g, ''));
  return <Field label={t.auth.email} value={code} onChangeText={onChangeText} />;
}

test('a value the screen cleans replaces what was typed', async () => {
  await render(<DigitsOnly />);
  await fireEvent.changeText(input(), '12a');
  expect(input()).toHaveDisplayValue('12');
});

test('a keystroke the screen cleans back to its old value is undone in the native text', async () => {
  await render(<DigitsOnly />);
  await fireEvent.changeText(input(), '12');
  expect(input()).toHaveDisplayValue('12');
  await fireEvent.changeText(input(), '12a');
  expect(input()).toHaveDisplayValue('12');
});
