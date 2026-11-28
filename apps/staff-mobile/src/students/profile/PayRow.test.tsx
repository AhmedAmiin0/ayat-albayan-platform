import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { balanceOf, subscription } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { PayRow } from './PayRow';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const serve = (balance: unknown) =>
  mockApi.onRead(async ({ path }) => {
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
  await waitFor(() =>
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/students/s1/balance' }),
  );
  expect(screen.queryByRole('button', { name: t.courseCard.pay })).toBeNull();
});
