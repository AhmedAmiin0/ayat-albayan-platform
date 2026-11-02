import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { SubscriptionItem } from './SubscriptionItem';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('docs/07 «الأزرار»: «إلغاء الباقة» is danger, full width under the tags (not shrink-wrapped in the tag line)', async () => {
  const fresh = subscription({ price: 81, paid: 0 });
  await renderWithQuery(<SubscriptionItem sub={{ ...fresh, balance: { ...fresh.balance, lessons_used: 0 } }} />);
  const box = screen.getByTestId('subscription-actions');
  expect(StyleSheet.flatten(box.props.style)).toMatchObject({ width: '100%' });
  // The row itself is the screen reader's button, so the edge is read off the label's pressable host.
  const cancel = within(box).getByText(t.subscriptions.cancel.action).parent;
  expect(cancel?.props.accessibilityRole).toBe('button');
  expect(StyleSheet.flatten(cancel?.props.style)).toMatchObject({ borderColor: palette.light.bad });
});

test('paid in full: no action box at all', async () => {
  await renderWithQuery(<SubscriptionItem sub={subscription({ status: 'active', price: 81, paid: 81 })} />);
  expect(screen.queryByTestId('subscription-actions')).toBeNull();
});
