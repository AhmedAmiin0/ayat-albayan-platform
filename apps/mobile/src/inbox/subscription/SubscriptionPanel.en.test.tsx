import en from '@ab/shared/i18n/en.json';
import type { ThreadPeople } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
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
  expect(screen.getByText(en.inbox.subscription.badge.expired)).toBeTruthy();
  // The short pill shows the kind; its spoken name says which child.
  expect(screen.getByRole('button', { name: `${en.inbox.subscription.renew} — يوسف` })).toBeTruthy();
  // Ended: the package by its name, no «0 left» under «Package finished».
  expect(screen.getByText(en.enums.packageSize['8'])).toBeTruthy();
});

test('an LTR run: a family that never subscribed, and a lead', async () => {
  await panel(family([child({ subscription: null })]));
  expect(screen.getByText(en.inbox.subscription.badge.none)).toBeTruthy();
  expect(screen.getByRole('button', { name: `${en.subscriptions.new} — يوسف` })).toBeTruthy();
  await panel({ guardian: null, lead: { id: 'a1', status: 'new' }, students: [] });
  expect(screen.getByRole('button', { name: en.inbox.subscription.subscribe })).toBeTruthy();
});

test('an LTR run: a family folds into «Subscribed: 1 of 2», and opens with «No package: …»', async () => {
  await panel(family([child(), child({ id: 'c2', name: 'Sara', subscription: null })]));
  expect(screen.getByText(en.inbox.subscription.subscribedOf.replace('{n}', '1').replace('{total}', '2'))).toBeTruthy();
  expect(screen.getByText(en.enums.subscriptionStatus.unpaid)).toBeTruthy();
  expect(screen.queryByText('يوسف')).toBeNull();
  const toggle = screen.getByRole('button', { name: new RegExp(`^${en.inbox.subscription.showStudents} — `) });
  await fireEvent.press(toggle);
  expect(screen.getByRole('button', { name: new RegExp(`^${en.inbox.subscription.hideStudents} — `) })).toBeTruthy();
  expect(screen.getByText(en.inbox.subscription.noPackage.replace('{names}', 'Sara'))).toBeTruthy();
  expect(screen.getByText('يوسف')).toBeTruthy();
});
