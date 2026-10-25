import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from './AppText';
import { Field } from '../form/Field';

test('aligns to the start (textAlign left, swapped in RTL); a caller style still wins', async () => {
  await render(
    <>
      <AppText>{t.auth.email}</AppText>
      <AppText style={{ textAlign: 'center' }}>{t.mobile.today}</AppText>
    </>,
  );
  expect(StyleSheet.flatten(screen.getByText(t.auth.email).props.style).textAlign).toBe('left');
  expect(StyleSheet.flatten(screen.getByText(t.mobile.today).props.style).textAlign).toBe('center');
});

test('Field: the label and the input both start at the inline-start', async () => {
  await render(<Field label={t.auth.email} ltr value="" onChangeText={() => undefined} />);
  expect(StyleSheet.flatten(screen.getByText(t.auth.email).props.style).textAlign).toBe('left');
  expect(StyleSheet.flatten(screen.getByLabelText(t.auth.email).props.style).textAlign).toBe('left');
});
