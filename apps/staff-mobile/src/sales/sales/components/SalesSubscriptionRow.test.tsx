import type { SalesSubscriptionView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { SalesSubscriptionRow } from './SalesSubscriptionRow';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Nothing is owed or due here: the row's money action stays hidden (SalesSubscriptionsScreen.money.test).
const mockApi = mockCall();
mockApi.onRead(async () => ({ students: [] }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const sub: SalesSubscriptionView = {
  id: 'sub1',
  student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' },
  package: '8',
  status: 'active',
  starts_on: '2026-10-01',
  lessons_total: 8,
};
beforeEach(() => jest.mocked(router.push).mockClear());

test("the row opens the student's details in each tree (owner 2026-10-28)", async () => {
  const view = await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <SalesSubscriptionRow sub={sub} withHistory={false} />
    </TreeBaseProvider>,
  );
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1', { withAnchor: true });
  await view.unmount();
  await renderWithQuery(<SalesSubscriptionRow sub={sub} withHistory={false} />);
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/students/st1', { withAnchor: true });
});
