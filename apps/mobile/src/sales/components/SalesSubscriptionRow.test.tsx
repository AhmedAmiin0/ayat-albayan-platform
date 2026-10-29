import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { SalesSubscriptionRow } from './SalesSubscriptionRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
// Nothing is owed or due here: the row's money action stays hidden (SalesSubscriptionsScreen.money.test).
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: jest.fn(async () => ({ students: [] })) }));

const sub = { id: 'sub1', student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' }, package: '8', status: 'active', starts_on: null, lessons_total: 8 };
beforeEach(() => jest.mocked(router.push).mockClear());

test('the row opens the student\'s details in each tree (owner 2026-10-28)', async () => {
  const view = await renderWithQuery(<TreeBaseProvider value="/sales"><SalesSubscriptionRow sub={sub} withHistory={false} /></TreeBaseProvider>);
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
  await view.unmount();
  await renderWithQuery(<SalesSubscriptionRow sub={sub} withHistory={false} />);
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/students/st1');
});
