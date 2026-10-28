import { render, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { child, family, usedUp } from './people-fixtures';
import { SubscriptionPanel } from './SubscriptionPanel';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('docs/07 «الأزرار»: the subscribe button fills the line beside the chip (never shrink-wrapped)', async () => {
  await render(
    <SubscriptionPanel data={{ pages: [{ people: family([child({ subscription: usedUp })]) }], pageParams: [undefined] }} phone="+966552147730" />,
  );
  const cell = screen.getByTestId('subscribe-action');
  expect(cell.props.style).toMatchObject({ flex: 1 });
  expect(within(cell).getByRole('button', { name: t.inbox.subscription.renew })).toBeTruthy();
});
