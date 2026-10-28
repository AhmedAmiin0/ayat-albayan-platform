import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { SalesSubscriptionRow } from './SalesSubscriptionRow';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

const sub = { id: 'sub1', student: { id: 'st1', code: 'AB-0183', name: 'يوسف أحمد' }, package: '8', status: 'active', starts_on: null, lessons_total: 8 };
beforeEach(() => jest.mocked(router.push).mockClear());

test('the row opens the student\'s details in each tree (owner 2026-10-28)', async () => {
  const view = await render(<TreeBaseProvider value="/sales"><SalesSubscriptionRow sub={sub} withHistory={false} /></TreeBaseProvider>);
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st1');
  await view.unmount();
  await render(<SalesSubscriptionRow sub={sub} withHistory={false} />);
  await fireEvent.press(screen.getByText('يوسف أحمد'));
  expect(router.push).toHaveBeenCalledWith('/students/st1');
});
