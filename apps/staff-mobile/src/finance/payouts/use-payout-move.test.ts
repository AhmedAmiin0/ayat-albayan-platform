import { QueryClient } from '@tanstack/react-query';
import { refreshMoney } from './use-payout-move';

test('a payout move re-reads the payouts, the ledger, the dashboard and the money lists', async () => {
  const client = new QueryClient();
  const spy = jest.spyOn(client, 'invalidateQueries');
  await refreshMoney(client);
  expect(spy.mock.calls.map(([f]) => f?.queryKey?.[0]).sort()).toEqual(['dashboard', 'payments', 'payouts', 'receivables', 'teacher-earnings']);
});
