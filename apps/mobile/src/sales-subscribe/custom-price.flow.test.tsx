import { renderApp, resetApp } from '@/test/app-router'; // first: its jest.mock calls must precede the app
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { SalesFamilyStudent } from '@ab/shared';
import { z } from 'zod';
import { GUARDIAN_PHONE, inboxBackend } from '@/inbox/shared/flow-backend';
import { t } from '@/core/lib/i18n/i18n';
import { familyOf, kid, openSub } from './testing/fixtures';

// «مبلغ مخصص» (owner 2026-11-02): the transfer that follows the save starts from the custom price.
const m = t.salesMoney;
const LABEL = new RegExp(t.subscriptions.customPrice.label.split(' (')[0] ?? '');
const press = async (role: 'button' | 'checkbox', name: string) =>
  fireEvent.press(await screen.findByRole(role, { name }));

beforeEach(resetApp);

const priced = z.object({ customPrice: z.number().optional() });

/** The API keeps the typed price as the package's: due = customPrice. */
function backendWithPrice() {
  const { backend } = inboxBackend();
  let student: SalesFamilyStudent = kid();
  backend
    .on('GET /auth/me', () => ({ role: 'admin', permissions: ['inbox.read', 'self.sales', 'self.sales_money'] }))
    .on('GET /sales/money/family', () => familyOf(student))
    .on('POST /sales/subscriptions/quote', () => jest.requireActual('./testing/fixtures').salesQuote)
    .on('POST /sales/subscriptions', (req) => {
      const price = priced.parse(req.body).customPrice ?? 180;
      const sub = openSub({ price, due: price });
      student = kid({ open: [sub] });
      return sub;
    })
    .on('GET /sales/booking/course', () => jest.requireActual('@/sales-course/testing/fixtures').courseView())
    .on('GET /sales/booking/teachers', () => [])
    .on('GET /sales/money/chat-receipts', () => []);
  return backend;
}

test('a custom package price: the transfer amount defaults to it', async () => {
  const backend = backendWithPrice();
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('button', { name: /أم يوسف/ }));
  expect(app.pathname()).toBe(`/inbox/thread/${GUARDIAN_PHONE}`);
  await press('button', m.newSubscription);
  await screen.findByRole('button', { name: m.saveSubscription, disabled: false });
  await press('checkbox', t.paymentLinks.customAmount);
  await fireEvent.changeText(screen.getByLabelText(LABEL), '150');
  await press('button', m.saveSubscription);
  await waitFor(() => expect(app.pathname()).toBe('/inbox/sales-course'));
  expect(backend.sent('POST /sales/subscriptions')[0]?.body).toMatchObject({ customPrice: 150 });
  await press('button', m.stepTransfer);
  await waitFor(() => expect(app.pathname()).toBe('/inbox/sales-transfer'));
  const amount = await screen.findByLabelText(t.payments.amount);
  expect(amount.props.value).toBe('150');
});
