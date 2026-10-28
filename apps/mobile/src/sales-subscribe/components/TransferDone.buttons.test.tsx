import { render, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { palette } from '@/theme';
import { salesPayment } from '../testing/fixtures';
import { TransferDone } from './TransferDone';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn() } }));

test('docs/07 «الأزرار»: «تم» the one filled button, alone; the two ways on are one outlined ButtonRow', async () => {
  await render(<TransferDone payment={salesPayment('active')} onDone={jest.fn()} />);
  const row = screen.getByTestId('transfer-done-actions');
  const cells = within(row).getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.booking.bookCourseDays)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(t.salesMoney.openMyPayments)).toBeTruthy();
  expect(within(row).queryByText(t.salesMoney.done)).toBeNull();
  const done = StyleSheet.flatten(screen.getByRole('button', { name: t.salesMoney.done }).props.style);
  expect(done).toMatchObject({ backgroundColor: palette.light.lapisFill });
});
