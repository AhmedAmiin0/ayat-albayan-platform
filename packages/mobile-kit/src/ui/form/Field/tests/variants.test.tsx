import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { Field } from '../Field';

afterEach(() => jest.restoreAllMocks());

test('a password field stays on the React Native input (system password autofill pairing)', async () => {
  await render(<Field label={t.auth.password} secureTextEntry value="pw" />);
  expect(screen.getByLabelText(t.auth.password)).not.toHaveProp('expoUi', true);
});

test('a field that tracks the cursor stays on the React Native input and gets its events', async () => {
  const onSelectionChange = jest.fn();
  await render(<Field label={t.auth.email} value="ab" onSelectionChange={onSelectionChange} />);
  const input = screen.getByLabelText(t.auth.email);
  expect(input).not.toHaveProp('expoUi', true);
  const event = { nativeEvent: { selection: { start: 1, end: 1 } } };
  await fireEvent(input, 'selectionChange', event);
  expect(onSelectionChange).toHaveBeenCalledWith(event);
});

test('the React Native input calls onFocus, onBlur and onSubmitEditing too', async () => {
  const onSubmitEditing = jest.fn();
  const onBlur = jest.fn();
  await render(
    <Field label={t.auth.password} secureTextEntry value="" {...{ onSubmitEditing, onBlur }} />,
  );
  await fireEvent(screen.getByLabelText(t.auth.password), 'submitEditing');
  await fireEvent(screen.getByLabelText(t.auth.password), 'blur');
  expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  expect(onBlur).toHaveBeenCalledTimes(1);
});

// The keyboard library tracks only an Android EditText: a Compose field would stay under the
// keyboard in a KeyboardScroll form.
test('on Android every field stays on the React Native input', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  await render(<Field label={t.auth.email} value="a@b.c" />);
  expect(screen.getByLabelText(t.auth.email)).not.toHaveProp('expoUi', true);
});

test('a prop the native input lacks sends the field to React Native, never dropped', async () => {
  const onKeyPress = jest.fn();
  await render(<Field label={t.auth.email} value="" onKeyPress={onKeyPress} selectTextOnFocus />);
  const input = screen.getByLabelText(t.auth.email);
  expect(input).not.toHaveProp('expoUi', true);
  expect(input).toHaveProp('selectTextOnFocus', true);
  await fireEvent(input, 'keyPress', { nativeEvent: { key: 'a' } });
  expect(onKeyPress).toHaveBeenCalledTimes(1);
});

test('a top-aligned multiline field stays native: the native field already starts at the top', async () => {
  await render(<Field label={t.auth.email} value="" multiline textAlignVertical="top" />);
  expect(screen.getByLabelText(t.auth.email)).toHaveProp('expoUi', true);
});
