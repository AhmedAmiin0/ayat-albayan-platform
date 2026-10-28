import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { paymentLink } from '../../testing/link-fixtures';
import { PaymentLinkItem } from './PaymentLinkItem';

test('docs/07 «الأزرار»: «إلغاء الرابط» on an open link is the outlined danger button', async () => {
  await renderWithQuery(<PaymentLinkItem link={paymentLink()} now={new Date('2026-10-28T10:00:00Z')} />);
  const cancel = screen.getByRole('button', { name: `${t.paymentLinks.cancel} — ريم` });
  expect(StyleSheet.flatten(cancel.props.style)).toMatchObject({ borderWidth: 1, borderColor: palette.light.bad });
});
