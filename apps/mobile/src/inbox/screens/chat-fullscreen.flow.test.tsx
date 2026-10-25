import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { subscribeBackend } from '@/subscribe/flow-backend';
import { GUARDIAN_PHONE, inboxBackend } from '../flow-backend';
import { inbound, PHONE } from '../thread-fixtures';

beforeEach(resetApp);

// The real root, tabs and (admin-chat) layouts. A chat is its own full screen above the tabs (the root
// stack holds the group over (tabs)), never a screen inside a tab with the bar hidden: on Android a
// hidden bar still took the touches at the bottom (react-native-screens#4132). In jest the covered
// tabs stay mounted, so the invariant is read from the router, not from the bar's buttons.

test('a chat opens above the tabs, not inside one; back pops it to the list, same URLs', async () => {
  const { backend } = inboxBackend();
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /هدى سالم/ }));
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`);
  expect(app.segments()[0]).toBe('(admin-chat)');
  expect(app.stack()).toEqual(['(tabs)', '(admin-chat)']);

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(app.pathname()).toBe('/inbox');
  expect(app.segments()[0]).toBe('(tabs)');
  expect(app.stack()).toEqual(['(tabs)']);
  expect(screen.getByRole('button', { name: t.mobile.more })).toBeTruthy();
});

test('a chat opened from its URL has no tab host under it; what it opens stays in its group; back returns to it', async () => {
  const { backend } = subscribeBackend({ hold: false });
  const app = await renderApp({ url: `/inbox/thread/${GUARDIAN_PHONE}`, backend });
  expect(await screen.findByText(t.inbox.subscription.badge.expired)).toBeTruthy();
  expect(app.stack()).toEqual(['(admin-chat)']);
  expect(screen.queryByRole('button', { name: t.mobile.more })).toBeNull();

  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.subscription.renew }));
  expect(app.pathname()).toBe('/inbox/subscribe');
  expect(app.segments()[0]).toBe('(admin-chat)');
  expect(app.stack()).toEqual(['(admin-chat)']);

  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  expect(app.segments()[0]).toBe('(admin-chat)');
});
