import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { TreeBaseProvider } from '@/nav/tree-base';
import { KID, salesPayment } from './fixtures';
import { TransferDone } from './TransferDone';

const mockPush = jest.fn();
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (h: unknown) => mockPush(h), dismissTo: (h: unknown) => mockDismissTo(h) },
}));

beforeEach(() => jest.clearAllMocks());

test('«احجز أيام الحلقات الآن» opens the course wizard for the student, in her tree', async () => {
  const onDone = jest.fn();
  await render(
    <TreeBaseProvider value="/sales">
      <TransferDone payment={salesPayment('active')} onDone={onDone} />
    </TreeBaseProvider>,
  );
  expect(screen.getByText(t.salesMoney.becameSubscribed)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.bookCourseDays }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/sales/inbox/sales-course', params: { studentId: KID } });
  // «مدفوعاتي» is a tab's screen: the chat group pops back to her tabs (no second tab host).
  await fireEvent.press(screen.getByRole('button', { name: t.salesMoney.openMyPayments }));
  expect(mockDismissTo).toHaveBeenCalledWith('/sales/more/earnings?view=payments');
  await fireEvent.press(screen.getByRole('button', { name: t.salesMoney.done }));
  expect(onDone).toHaveBeenCalled();
});

test('the admin tree (double role) links without a prefix', async () => {
  await render(<TransferDone payment={salesPayment('new')} onDone={jest.fn()} />);
  expect(screen.getByText(t.salesMoney.transferSaved)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.bookCourseDays }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/sales-course', params: { studentId: KID } });
});
