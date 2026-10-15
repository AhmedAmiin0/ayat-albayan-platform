import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { GUARDIAN_PHONE } from '@/inbox/flow-backend';
import { PHONE } from '@/inbox/thread-fixtures';
import { t } from '@/lib/i18n';
import { armCamera } from '@/test/native-mocks';
import { booked } from '@/booking/fixtures';
import { subscribeBackend } from './flow-backend';
import { CHILD } from './fixtures';

const s = t.inbox.subscription;
const press = async (role: 'button' | 'radio' | 'checkbox', name: string) =>
  fireEvent.press(await screen.findByRole(role, { name }));

beforeEach(resetApp);

test('expired family: chip «انتهت الباقة» → «جدّد» → quote → save once → back: the chat chip and the list tag say «مشترك»', async () => {
  const { backend, state } = subscribeBackend({ hold: true });
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /أم يوسف/ }));
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  expect(await screen.findByText(s.badge.expired)).toBeTruthy(); // the chat's chip

  await press('button', s.renew);
  expect(app.pathname()).toBe('/inbox/subscribe');
  expect(await screen.findByRole('header', { name: s.renew })).toBeTruthy();
  const save = await screen.findByRole('button', { name: s.make, disabled: false });
  expect(backend.sent('POST /subscriptions/quote')[0]?.body).toMatchObject({ studentId: CHILD });

  await fireEvent.press(save);
  await fireEvent.press(save);
  await fireEvent.press(save); // a second tap while the save is in flight joins it
  await act(async () => state.release());
  expect(await screen.findByText(t.subscriptions.saved)).toBeTruthy();
  expect(backend.sent('POST /subscriptions')).toHaveLength(1);
  expect(backend.sent('POST /subscriptions')[0]?.body).toMatchObject({
    studentId: CHILD,
    startsOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });

  await press('button', s.backToChat);
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  await waitFor(() => expect(screen.queryByText(s.badge.expired)).toBeNull());
  expect(screen.getByText(s.badge.subscribed)).toBeTruthy();

  await press('button', t.common.back);
  expect(app.pathname()).toBe('/inbox');
  const row = within(await screen.findByRole('button', { name: /أم يوسف/ }));
  await waitFor(() => expect(row.getByText(s.badge.subscribed)).toBeTruthy());
  expect(row.queryByText(s.badge.expired)).toBeNull();
});

test('a lead without a student: «اشترك» → camera invoice → POST /booking (8 lessons) → the subscription of the new student', async () => {
  armCamera();
  const { backend } = subscribeBackend();
  const app = await renderApp({ url: `/inbox/thread/${encodeURIComponent(PHONE)}`, backend });
  await press('button', s.subscribe);
  expect(app.pathname()).toBe('/inbox/book');
  expect(await screen.findByRole('header', { name: t.subscriptions.new })).toBeTruthy();

  await fireEvent.changeText(await screen.findByLabelText(t.leads.studentName), 'يوسف');
  await press('button', t.booking.next);
  await fireEvent.press(await screen.findByText('مريم المعلمة'));
  expect(screen.getByRole('radio', { name: t.enums.packageSize['8'], checked: true })).toBeTruthy();
  await press('button', t.booking.next);
  await press('button', '17:00');
  await press('button', t.booking.mobile.takePhoto);
  expect(await screen.findByLabelText(new RegExp(`^${t.booking.mobile.invoiceA11y.split('{source}')[0]}`))).toBeTruthy();
  await press('button', t.booking.next);
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();

  const post = backend.sent('POST /booking')[0]?.body as { clientRequestId: string };
  expect(post).toMatchObject({
    kind: 'package',
    package: '8',
    leadId: 'a1',
    invoice: { source: 'upload', path: 'req/0b1c.jpg' },
    newStudent: { name: 'يوسف', status: 'new' },
  });
  expect(backend.sent('POST /booking/invoice-upload-url')[0]?.body).toMatchObject({
    clientRequestId: post.clientRequestId,
  });
  expect(backend.uploads).toEqual([{ bucket: 'invoices', path: 'req/0b1c.jpg' }]);

  await press('button', s.make);
  await waitFor(() => expect(app.pathname()).toBe('/inbox/subscribe'));
  const [studentId] = booked('2026-10-04T14:00:00.000Z').student_ids;
  expect(backend.sent('GET /students/:id').at(-1)?.path).toBe(`/students/${studentId}`);
  await waitFor(() =>
    expect(backend.sent('POST /subscriptions/quote')[0]?.body).toMatchObject({
      studentId,
      pricing: { tier: 'starter' },
    }),
  );
});
