import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { PayRow } from './PayRow';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

// owner 2026-11-17 (board CourseXActions): «سجّل دفعة» is a row of «الدورة والباقة».
const serve = (balance: unknown) =>
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/students/s1/balance') return balance;
    throw new ApiError(404);
  });

beforeEach(() => jest.clearAllMocks());

test('a current package: the row with what it does opens the payment screen', async () => {
  serve(balanceOf(subscription({ status: 'active' })));
  await renderWithQuery(<PayRow studentId="s1" />);
  await fireEvent.press(await screen.findByRole('button', { name: t.courseCard.pay }));
  expect(mockPush).toHaveBeenCalledWith('/students/payment/s1');
});

test('no package: no row', async () => {
  serve(balanceOf());
  await renderWithQuery(<PayRow studentId="s1" />);
  await screen.findByText(() => true).catch(() => null);
  expect(screen.queryByRole('button', { name: t.courseCard.pay })).toBeNull();
});
