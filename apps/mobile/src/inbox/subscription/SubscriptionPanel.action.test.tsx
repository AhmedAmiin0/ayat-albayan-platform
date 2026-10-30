import type { ThreadPeople } from '@ab/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { isolate, ltr } from '@/core/ui/primitives/Ltr';
import { child, CHILD_ID, family, usedUp } from './people-fixtures';
import { SubscriptionPanel } from './SubscriptionPanel';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const s = t.inbox.subscription;
const PHONE = '+966552147730';
const panel = (people: ThreadPeople) =>
  render(<SubscriptionPanel data={{ pages: [{ people }], pageParams: [undefined] }} phone={PHONE} />);

beforeEach(() => {
  jest.mocked(router.push).mockClear();
});

test('one child: a short pill at the row’s end (never a full-width button); its spoken name names the child', async () => {
  await panel(family([child({ subscription: usedUp })]));
  const cell = screen.getByTestId('subscribe-action');
  expect(cell.props.style).toMatchObject({ flexShrink: 0 });
  const pill = within(cell).getByRole('button', { name: `${s.renew} — يوسف` });
  expect(within(pill).getByText(s.renew)).toBeTruthy();
  await fireEvent.press(pill);
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/inbox/subscribe',
    params: { studentId: CHILD_ID, phone: PHONE, renew: '1' },
  });
});

test('one renewal and one new child: «لأيّ طالب؟» lists each with its own kind and form', async () => {
  const sara = child({ id: 'c2', name: 'sara', code: 'AB-0184', subscription: null });
  await panel(family([sara, child({ subscription: usedUp })]));
  // Not every child renews: the pill says «اشتراك جديد» and names no one.
  await fireEvent.press(screen.getByRole('button', { name: t.subscriptions.new }));
  const sheet = screen.getByTestId('thread-menu');
  expect(sheet.props.accessibilityLabel).toBe(s.pickStudent);
  // A Latin name and the code stay apart in an Arabic row: each in its own isolate.
  expect(within(sheet).getByRole('button', { name: `${isolate('sara')} · ${ltr('AB-0184')} — ${t.subscriptions.new}` })).toBeTruthy();
  await fireEvent.press(within(sheet).getByRole('button', { name: `${isolate('يوسف')} · ${ltr('AB-0183')} — ${s.renew}` }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inbox/subscribe',
      params: { studentId: CHILD_ID, phone: PHONE, renew: '1' },
    }),
  );
  expect(router.push).toHaveBeenCalledTimes(1);
});
