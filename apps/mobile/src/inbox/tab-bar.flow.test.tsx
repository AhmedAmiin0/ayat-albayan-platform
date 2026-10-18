import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { subscribeBackend } from '@/subscribe/flow-backend';
import { GUARDIAN_PHONE, inboxBackend } from './flow-backend';
import { inbound, PHONE } from './thread-fixtures';

beforeEach(resetApp);

// The real tabs layout and AppNativeTabs; the NativeTabs mock drops its JS tab buttons while the
// host `hidden` is set (as tabBarHidden does on the device), so the bar's presence is observable.
const bar = () => screen.queryByRole('button', { name: t.mobile.more });

test('a chat hides the bottom tab bar; going back to the list brings it back, same URLs', async () => {
  const { backend } = inboxBackend();
  const app = await renderApp({ url: '/inbox', backend });
  await screen.findByRole('button', { name: /هدى سالم/ });
  expect(bar()).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: /هدى سالم/ }));
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`);
  await waitFor(() => expect(bar()).toBeNull());

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(app.pathname()).toBe('/inbox');
  await waitFor(() => expect(bar()).toBeTruthy());
});

test('a chat opened from its URL (a push) has no bar; a screen pushed from it has it; back hides it again', async () => {
  const { backend } = subscribeBackend({ hold: false });
  const app = await renderApp({ url: `/inbox/thread/${GUARDIAN_PHONE}`, backend });
  expect(await screen.findByText(t.inbox.subscription.badge.expired)).toBeTruthy();
  await waitFor(() => expect(bar()).toBeNull());

  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.subscription.renew }));
  expect(app.pathname()).toBe('/inbox/subscribe');
  await waitFor(() => expect(bar()).toBeTruthy());

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  await waitFor(() => expect(bar()).toBeNull());
});
