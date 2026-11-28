import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../../lib/i18n/i18n';
import { Field } from '../Field';

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
