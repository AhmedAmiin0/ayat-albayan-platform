import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { armCamera } from '@/test/native-mocks';
import { SUB_ID, subscription } from './fixtures';
import { paymentBackend, SIGNED } from './testing/flow-backend';

const m = t.payments.mobile;
const FIRST = t.payments.attachmentN.replace('{n}', '1');
const price = subscription().price;
// «مشترك» is also the student's own status word: count it before paying, so the card's chip is told apart.
const seen = { activeWords: 0 };

beforeEach(async () => {
  await resetApp();
  armCamera();
});

/** Students → search → the student → «سجّل دفعة» → the amount, bank, and a camera photo in «المرفقات». */
async function toPaymentForm(backend: ReturnType<typeof paymentBackend>['backend']) {
  const app = await renderApp({ url: '/students', backend });
  await fireEvent.changeText(await screen.findByLabelText(t.students.searchPlaceholder), 'هدى');
  await waitFor(() => expect(backend.sent('GET /students').at(-1)?.query['search']).toBe('هدى'));
  await fireEvent.press(await screen.findByRole('button', { name: /هدى/ }));
  expect(app.pathname()).toBe('/students/s1');
  expect(await screen.findByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
  seen.activeWords = screen.queryAllByText(t.enums.subscriptionStatus.active).length;
  await fireEvent.press(screen.getByRole('button', { name: m.record }));
  expect(app.pathname()).toBe('/students/payment/s1');
  await fireEvent.changeText(await screen.findByLabelText(t.payments.amount), String(price));
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.bank }));
  await fireEvent.press(screen.getByRole('button', { name: m.takePhoto }));
  expect(await screen.findByLabelText(FIRST)).toBeTruthy();
  return app;
}

test('students → search → student → camera attachment → POST /payments → back: the balance card is active', async () => {
  const { backend, state } = paymentBackend();
  const app = await toPaymentForm(backend);
  const activeBefore = seen.activeWords;
  await fireEvent.press(screen.getByRole('button', { name: m.record }));

  await waitFor(() => expect(app.pathname()).toBe('/students/s1'));
  expect(backend.sent('POST /payments/receipt-upload-url')[0]?.body).toEqual({
    subscriptionId: SUB_ID,
    mime: 'image/jpeg',
    size: 5,
  });
  expect(backend.uploads).toEqual([{ bucket: 'receipts', path: SIGNED.path }]);
  expect(backend.sent('POST /payments')).toHaveLength(1);
  expect(backend.sent('POST /payments')[0]?.body).toEqual({
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    subscriptionId: SUB_ID,
    amount: price,
    currency: 'SAR',
    method: 'bank',
    paidAt: expect.any(String),
    attachments: [SIGNED.path],
  });
  expect(state.sub.status).toBe('active');
  await waitFor(() => expect(screen.queryByText(t.enums.subscriptionStatus.unpaid)).toBeNull());
  expect(screen.getAllByText(t.enums.subscriptionStatus.active).length).toBeGreaterThan(activeBefore);
});

test('offline: the error line shows, the form keeps its values; retry re-sends the same id, no second upload', async () => {
  const { backend } = paymentBackend();
  backend.failOnce('POST /payments', new TypeError('Network request failed'));
  const app = await toPaymentForm(backend);
  await fireEvent.press(screen.getByRole('button', { name: m.record }));

  expect(await screen.findByText(m.offline)).toBeTruthy();
  expect(app.pathname()).toBe('/students/payment/s1');
  expect(screen.getByLabelText(t.payments.amount).props.value).toBe(String(price));
  expect(screen.getByRole('radio', { name: t.enums.paymentMethod.bank, checked: true })).toBeTruthy();
  expect(screen.getByLabelText(FIRST)).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: m.record }));
  await waitFor(() => expect(app.pathname()).toBe('/students/s1'));
  const posts = backend.sent('POST /payments').map((c) => c.body as { clientRequestId: string; attachments: string[] });
  expect(posts).toHaveLength(2);
  expect(posts[1]?.clientRequestId).toBe(posts[0]?.clientRequestId);
  expect(posts[1]?.attachments).toEqual([SIGNED.path]);
  expect(backend.sent('POST /payments/receipt-upload-url')).toHaveLength(1);
  expect(backend.uploads).toHaveLength(1);
  await waitFor(() => expect(screen.queryByText(t.enums.subscriptionStatus.unpaid)).toBeNull());
  expect(screen.getAllByText(t.enums.subscriptionStatus.active).length).toBeGreaterThan(seen.activeWords);
});
