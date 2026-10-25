import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booked, maryam, SUN_17 } from '@/booking/fixtures';
import { fakeBookingApi, walkToConfirm } from '@/booking/test-utils';
import { t } from '@/core/lib/i18n/i18n';
import { renderApp, resetApp } from '@/test/app-router';
import { inboxBackend } from './flow-backend';
import { inbound, PHONE } from './thread-fixtures';

beforeEach(resetApp);

/** The chats API, signed in as a salesperson (self.sales), with the sales booking mirror. */
function salesBackend(permissions: string[] = ['inbox.read', 'self.sales']) {
  const { backend } = inboxBackend();
  const booking = fakeBookingApi();
  const fetch = ({ path }: { path: string }) => booking.fetch(path.replace('/sales/booking', '/booking'));
  backend
    .on('GET /auth/me', () => ({ role: 'admin', permissions }))
    .on('GET /sales/booking/teachers', fetch)
    .on('GET /sales/booking/slots', fetch)
    .on('POST /sales/booking', () => booked(SUN_17));
  return backend;
}

async function openLeadChat(backend: ReturnType<typeof salesBackend>) {
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /هدى سالم/ }));
  expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`);
  return app;
}

test('a salesperson registers a new student from the chat: sales wizard → POST /sales/booking → back on the same chat', async () => {
  const backend = salesBackend();
  const app = await openLeadChat(backend);
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.registerNew }));
  expect(app.pathname()).toBe('/inbox/book');
  expect(await screen.findByRole('header', { name: t.inbox.registerNew })).toBeTruthy();
  // A trial only: no booking type to pick; the number comes from the chat.
  expect(screen.queryByLabelText(t.booking.kind.label)).toBeNull();
  expect(screen.getByLabelText(t.guardians.phone).props.value).toBe(PHONE);
  await walkToConfirm();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();

  expect(backend.sent('POST /booking')).toHaveLength(0);
  expect(backend.sent('GET /booking/teachers')).toHaveLength(0);
  expect(backend.sent('POST /sales/booking')[0]?.body).toMatchObject({
    kind: 'trial',
    teacherId: maryam.id,
    leadId: 'a1',
    newStudent: { name: 'يوسف' },
    guardian: { name: 'هدى سالم', phone_e164: PHONE, source: 'facebook_ad' },
  });
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.subscription.backToChat }));
  await waitFor(() => expect(app.pathname()).toBe(`/inbox/thread/${PHONE}`));
});

test('without self.sales (the admin) the chat has no «تسجيل طالب جديد»', async () => {
  await openLeadChat(salesBackend(['inbox.read', 'leads.read']));
  expect(await screen.findByText(inbound.body ?? '')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.inbox.registerNew })).toBeNull();
});
