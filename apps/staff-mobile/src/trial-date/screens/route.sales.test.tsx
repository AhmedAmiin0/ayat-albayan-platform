import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { queryClient } from '@ab/mobile-kit';
import { TabStack } from '@/core/nav/TabStack';
import SalesChatLayout from '../../../app/(sales-chat)/_layout';
import TrialDateRoute from '../../../app/(sales-chat)/sales/inbox/trial-date';
import TabsLayout from '../../../app/(tabs)/_layout';
import RootLayout from '../../../app/_layout';
import SalesLayout from '../../../app/sales/_layout';
import { mockCall } from '@ab/testing/mock-call';

// From a salesperson's family chat: a route of the (sales-chat) group beside its book route, so the
// chat's screens stay full screens with no tab bar under them (react-native-screens#4132).
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@ab/mobile-kit/push/registerPush', () => ({
  registerPush: jest.fn(async () => undefined),
}));
const mockApi = mockCall();
mockApi.onRead(async ({ path }) => (path === '/auth/me' ? { role: 'sales' } : { total: 0 }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('@ab/mobile-kit/auth/use-auth-gate', () => ({ useAuthGate: () => 'sales' }));
jest.mock('./TrialDateFlow', () => ({
  TrialDateFlow: (p: { studentId: string; name: string }) => {
    const { Text: T } = jest.requireActual('react-native');
    const { useBookingMode } = jest.requireActual('@/booking/shared/booking-mode');
    return <T>{`flow:${p.studentId}:${p.name}:${useBookingMode()}`}</T>;
  },
}));

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: RootLayout,
  login: stub('login-screen'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': stub('admin-today'),
  'sales/_layout': SalesLayout,
  'sales/inbox/_layout': TabStack,
  'sales/inbox/index': stub('sales-inbox'),
  '(sales-chat)/_layout': SalesChatLayout,
  '(sales-chat)/sales/inbox/trial-date': TrialDateRoute,
};

beforeEach(async () => {
  queryClient.clear();
  await AsyncStorage.clear();
});

test('/sales/inbox/trial-date opens in (sales-chat), a full screen, booking in sales mode', async () => {
  const pending = renderRouter(app, { initialUrl: '/sales/inbox/trial-date?studentId=k1&name=x' });
  await pending;
  expect(await screen.findByText('flow:k1:x:sales')).toBeTruthy();
  expect(pending.getPathname()).toBe('/sales/inbox/trial-date');
  expect(pending.getSegments()[0]).toBe('(sales-chat)');
  expect(screen.queryAllByRole('button')).toHaveLength(0); // no tab host around it
});
