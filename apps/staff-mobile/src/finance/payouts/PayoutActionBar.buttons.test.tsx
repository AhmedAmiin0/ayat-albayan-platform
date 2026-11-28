import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t, palette } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { APPROVED, PAID } from '@/finance/shared/fixtures';
import { PayoutActionBar } from './PayoutActionBar';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
mockApi.onRead(() => new Promise(() => undefined));
mockApi.onWrite(() => new Promise(() => undefined));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const style = (name: string) =>
  StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
const light = palette.light;

test('approved: «تأكيد الدفع» filled and alone; «إعادة فتح» an outlined cell, never ghost', async () => {
  await renderWithQuery(<PayoutActionBar payout={APPROVED} onPay={jest.fn()} onDone={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(1);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.finance.reopen)).toBeTruthy();
  expect(style(t.finance.confirmPaid)).toMatchObject({ backgroundColor: light.lapisFill });
  expect(style(t.finance.reopen)).toMatchObject({ borderColor: light.ruleInput, borderWidth: 1 });
});

test('paid: «عرض الإيصال» | «إلغاء الدفع» (danger) in one ButtonRow; the confirm strip puts unpay first', async () => {
  await renderWithQuery(<PayoutActionBar payout={PAID} onPay={jest.fn()} onDone={jest.fn()} />);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[1] as (typeof cells)[number]).getByText(t.finance.unpay)).toBeTruthy();
  expect(style(t.finance.unpay)).toMatchObject({ borderColor: light.bad });
  await fireEvent.press(screen.getByRole('button', { name: t.finance.unpay }));
  const strip = screen.getAllByTestId('button-row-cell');
  expect(within(strip[0] as (typeof strip)[number]).getByText(t.finance.unpay)).toBeTruthy();
  expect(within(strip[1] as (typeof strip)[number]).getByText(t.common.cancel)).toBeTruthy();
  expect(style(t.common.cancel)).toMatchObject({ borderColor: light.ruleInput });
});
