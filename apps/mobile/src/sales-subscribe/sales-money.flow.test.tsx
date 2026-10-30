import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { SalesFamilyStudent } from '@ab/shared';
import { GUARDIAN_PHONE, inboxBackend } from '@/inbox/shared/flow-backend';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { chatImage, familyOf, kid, MSG, openSub, salesPayment, SUB } from './testing/fixtures';

const m = t.salesMoney;
const press = async (role: 'button' | 'radio', name: string) => fireEvent.press(await screen.findByRole(role, { name }));

beforeEach(resetApp);

/** The chats API as a salesperson with self.sales_money; her student of the family pays on the transfer. */
function salesMoneyBackend() {
  const { backend } = inboxBackend();
  let student: SalesFamilyStudent = kid();
  backend
    .on('GET /auth/me', () => ({ role: 'admin', permissions: ['inbox.read', 'self.sales', 'self.sales_money'] }))
    .on('GET /sales/money/family', () => familyOf(student))
    .on('POST /sales/subscriptions/quote', () => jest.requireActual('./testing/fixtures').salesQuote)
    .on('POST /sales/subscriptions', () => {
      student = kid({ open: [openSub()] });
      return openSub();
    })
    .on('GET /sales/booking/course', () => jest.requireActual('@/sales-course/testing/fixtures').courseView())
    .on('GET /sales/booking/teachers', () => [])
    .on('GET /sales/money/chat-receipts', () => [chatImage])
    .on('GET /sales/money/chat-receipts/:id', () => ({ url: 'https://x/t.jpg', expires_at: '', mime: 'image/jpeg' }))
    .on('POST /sales/payments/receipt-from-chat', () => ({ receipt_path: `${SUB}/c.jpg` }))
    .on('POST /sales/payments', () => {
      student = kid({ status: 'active' });
      return salesPayment('active');
    });
  return backend;
}

test('from a family chat: «اشتراك جديد» → saved → the days (later) → the transfer with a chat file → «أصبح الطالب مشتركًا» → back to the chat', async () => {
  const backend = salesMoneyBackend();
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /أم يوسف/ }));
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  expect(screen.queryByRole('button', { name: m.recordTransfer })).toBeNull();

  await press('button', m.newSubscription);
  expect(app.pathname()).toBe('/inbox/sales-subscribe');
  await fireEvent.press(await screen.findByRole('button', { name: m.saveSubscription, disabled: false }));
  // On to the package's weekly days (owner 2026-10-18); the transfer may come first.
  await waitFor(() => expect(app.pathname()).toBe('/inbox/sales-course'));
  await press('button', m.stepTransfer);
  await waitFor(() => expect(app.pathname()).toBe('/inbox/sales-transfer'));
  expect(backend.sent('POST /subscriptions')).toHaveLength(0);
  expect(backend.sent('POST /sales/subscriptions')[0]?.body).toMatchObject({ clientRequestId: expect.any(String) });

  await press('button', m.receiptFromChat);
  await press('button', `${instantDay(chatImage.created_at, 'Asia/Riyadh')} · ${chatImage.caption ?? ''}`);
  expect(await screen.findByText(m.attachmentN.replace('{n}', '1'))).toBeTruthy();
  await press('button', m.saveTransfer);
  expect(await screen.findByText(m.becameSubscribed)).toBeTruthy();
  expect(backend.sent('POST /sales/payments/receipt-from-chat')[0]?.body).toEqual({ subscriptionId: SUB, messageId: MSG });
  expect(backend.sent('POST /sales/payments')[0]?.body).toMatchObject({ subscriptionId: SUB, attachments: [`${SUB}/c.jpg`] });
  expect(backend.sent('POST /payments')).toHaveLength(0);

  await press('button', m.done);
  await waitFor(() => expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`));
  expect(await screen.findByRole('button', { name: m.newSubscription })).toBeTruthy();
  // The family refetched: nothing owed any more.
  await waitFor(() => expect(screen.queryByRole('button', { name: m.recordTransfer })).toBeNull());
});
