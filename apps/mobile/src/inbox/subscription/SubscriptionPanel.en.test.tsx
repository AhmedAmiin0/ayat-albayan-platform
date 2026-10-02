import en from '@ab/shared/i18n/en.json';
import type { ThreadPeople } from '@ab/shared';
import { render, screen } from '@testing-library/react-native';
import { child, family, usedUp } from './people-fixtures';
import { SubscriptionPanel } from './SubscriptionPanel';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const panel = (people: ThreadPeople) =>
  render(
    <SubscriptionPanel
      data={{ pages: [{ people }], pageParams: [undefined] }}
      phone="+966552147730"
    />,
  );

test('an LTR run words the chat’s subscription from en.json', async () => {
  await panel(family([child({ subscription: usedUp })]));
  expect(screen.getByText(en.inbox.subscription.expired)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.inbox.subscription.renew })).toBeTruthy();
  expect(
    screen.getByText(`يوسف · ${en.enums.packageSize['8']} · ${en.subscriptions.progress.zero}`),
  ).toBeTruthy();
});

test('an LTR run: a family that never subscribed, and a lead', async () => {
  await panel(family([child({ subscription: null })]));
  expect(screen.getByText(en.inbox.subscription.none)).toBeTruthy();
  expect(screen.getByRole('button', { name: en.subscriptions.new })).toBeTruthy();
  await panel({ guardian: null, lead: { id: 'a1', status: 'new' }, students: [] });
  expect(screen.getByRole('button', { name: en.inbox.subscription.subscribe })).toBeTruthy();
});
