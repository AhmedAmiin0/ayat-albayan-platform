import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { MoneySection } from './MoneySection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('«المالية» heading and its three rows open the money screens', async () => {
  await render(<MoneySection />);
  expect(screen.getByRole('header', { name: t.mobileMoney.section })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileMoney.receivablesTitle }));
  expect(router.push).toHaveBeenCalledWith('/more/money/receivables');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileMoney.subscriptionsTitle }));
  expect(router.push).toHaveBeenCalledWith('/more/money/subscriptions');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileMoney.paymentsTitle }));
  expect(router.push).toHaveBeenCalledWith('/more/money/payments');
});
