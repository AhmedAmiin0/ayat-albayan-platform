import { screen } from '@testing-library/react-native';
import { t, isolate } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { myPayment } from '@/sales-money/testing/fixtures';
import { MyPaymentItem } from '@/sales-money/components/MyPaymentItem/MyPaymentItem';

test('Arabic: the Arabic note is isolated inside the «note:» line', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash' })} />);
  expect(screen.getByText(`${t.assistantPortal.payments.note}: ${isolate('دفعة أولى')}`)).toBeTruthy();
});

test('Arabic: no note, no line', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash', note: null })} />);
  expect(screen.queryByText(new RegExp(`^${t.assistantPortal.payments.note}:`))).toBeNull();
});
