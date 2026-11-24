import { screen } from '@testing-library/react-native';
import { ApiError } from '@ab/mobile-kit';
import { balanceOf, page, subscription } from '@/payments/fixtures';
import { partPaidLine } from '@/core/lib/money/format';
import { renderWithQuery } from '@/test/query';
import { BalanceCard } from '@/students/profile/BalanceCard/BalanceCard';

// A package of 81 with 80 received is still unpaid.
const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const partPaidText = partPaidLine({ paid: 80, price: 81, currency: 'SAR' }) ?? '';

function serve(paid: number) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1/balance') return balanceOf(subscription({ price: 81, paid }));
    if (path === '/settings') return { renewal_alert_remaining: 2 };
    if (path.startsWith('/payments?')) return page([]);
    throw new ApiError(404);
  });
}

test('80 of 81: the part-paid line instead of «دُفع …»', async () => {
  serve(80);
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(partPaidText)).toBeTruthy();
  expect(screen.queryByText(/دُفع /)).toBeNull();
});

test('nothing paid: «دُفع 0 من …», no part-paid line', async () => {
  serve(0);
  await renderWithQuery(<BalanceCard studentId="s1" />);
  expect(await screen.findByText(/دُفع /)).toBeTruthy();
  expect(screen.queryByText(partPaidText)).toBeNull();
});
