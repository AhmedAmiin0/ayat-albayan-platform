import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { balanceOf, WEEKLY } from '@/features/finance/subscriptions/money-fixture';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { RenewSubscriptionButton } from './RenewSubscriptionButton';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const C = t.subscriptions.customPrice;
const QUOTE = WEEKLY.price_source;
const STUDENT = { id: 'stu-1', name: 'سهيلة', code: 'AB-0183' };
const boxName = C.label.replace('{currency}', 'ر.س');
const posts = () =>
  apiSend.mock.calls.filter((c) => c[1] === '/subscriptions').map((c) => c[2] as Record<string, unknown>);

function answer() {
  const reply = (path: string) => (path === '/subscriptions/quote' ? QUOTE : WEEKLY);
  apiSend.mockImplementation(async (_m: string, path: string) => reply(path));
}

async function openNew() {
  answer();
  const ui = <CreateSubscriptionDialog student={STUDENT} onClose={vi.fn()} onSaved={vi.fn()} />;
  renderWithClient(ui);
  return dialogOf(await screen.findByRole('dialog', { name: t.subscriptions.new }));
}

async function openRenewal() {
  routeFetch(apiFetch, [['/students/stu-1/balance', balanceOf([WEEKLY])]]);
  answer();
  renderWithClient(<RenewSubscriptionButton student={{ ...STUDENT, status: 'expired' }} />);
  const renew = await screen.findByRole<HTMLButtonElement>('button', { name: t.students.renew });
  await vi.waitFor(() => expect(renew.disabled).toBe(false));
  fireEvent.click(renew);
  return dialogOf(await screen.findByRole('dialog', { name: t.subscriptions.new }));
}

function dialogOf(el: HTMLElement) {
  const dialog = within(el);
  return {
    dialog,
    toggle: () => fireEvent.click(dialog.getByRole('button', { name: t.paymentLinks.customAmount })),
    save: () => fireEvent.click(dialog.getByRole('button', { name: t.common.save })),
    box: () => dialog.findByRole<HTMLInputElement>('textbox', { name: boxName }),
  };
}

describe('«مبلغ مخصص» on the admin’s package price (owner 2026-11-02)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('off (the default): the body is today’s, no customPrice', async () => {
    const { dialog, save } = await openNew();
    expect(dialog.queryByRole('textbox', { name: boxName })).toBeNull();
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).not.toHaveProperty('customPrice');
  });

  it('on: starts from the quote, the typed price goes as customPrice', async () => {
    const { toggle, save, box } = await openNew();
    toggle();
    await vi.waitFor(async () => expect((await box()).value).toBe(String(QUOTE.afterDiscount)));
    fireEvent.change(await box(), { target: { value: '120.5' } });
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ customPrice: 120.5 });
  });

  it('an invalid price is said, nothing saved; off again drops it', async () => {
    const { dialog, toggle, save, box } = await openNew();
    toggle();
    fireEvent.change(await box(), { target: { value: 'abc' } });
    save();
    expect(await dialog.findByText(C.invalid)).toBeTruthy();
    expect(posts()).toHaveLength(0);
    toggle();
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).not.toHaveProperty('customPrice');
  });

  it('a renewal from the student profile sends it too', async () => {
    const { toggle, save, box } = await openRenewal();
    toggle();
    fireEvent.change(await box(), { target: { value: '99' } });
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ studentId: 'stu-1', customPrice: 99 });
  });
});
