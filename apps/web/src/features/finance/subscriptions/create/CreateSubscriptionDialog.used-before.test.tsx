import { daysBefore, lessonsOf, riyadhToday } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { WEEKLY } from '../money-fixture';

const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['subscriptions.set_start_date'] }));
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));
vi.mock('@/features/people/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

// «حلقات مستخدمة من الباقة» in the admin's «اشتراك جديد» (owner 2026-10-28): only with a start before today.
const posts = () => apiSend.mock.calls.filter((c) => c[1] === '/subscriptions').map((c) => c[2] as Record<string, unknown>);
const today = riyadhToday();
const past = daysBefore(today, 10);

function open() {
  apiSend.mockImplementation(async (_m: string, path: string) => (path === '/subscriptions/quote' ? WEEKLY.price_source : WEEKLY));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateSubscriptionDialog student={{ id: 'stu-1', name: 'سهيلة', code: 'AB-0183' }} onClose={vi.fn()} onSaved={vi.fn()} />
    </QueryClientProvider>,
  );
  const dialog = within(screen.getByRole('dialog', { name: t.subscriptions.new }));
  const day = (value: string) => fireEvent.change(dialog.getByLabelText(t.subscriptions.startsOn), { target: { value } });
  const more = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.usedBeforeMore }));
  const stepper = () => dialog.queryByRole('group', { name: t.salesMoney.usedBefore });
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.common.save }));
  return { dialog, day, more, stepper, save };
}

describe('CreateSubscriptionDialog: lessons used before the platform', () => {
  afterEach(() => {
    apiSend.mockReset();
    perms.list = ['subscriptions.set_start_date'];
  });

  it('hidden for today; a past day shows it at 0 with its note, and the body carries the count', async () => {
    const { dialog, day, more, stepper, save } = open();
    expect(stepper()).toBeNull();
    day(past);
    expect(stepper()?.textContent).toContain('0');
    expect(dialog.getByText(t.salesMoney.usedBeforeHint)).toBeTruthy();
    more();
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).toMatchObject({ startsOn: past, lessonsUsedBefore: 1 });
  });

  it('0 is not sent; moving the day to today hides it and puts it back to 0', async () => {
    const { day, more, stepper, save } = open();
    day(past);
    more();
    day(today);
    expect(stepper()).toBeNull();
    day(past);
    expect(stepper()?.textContent).toContain('0');
    save();
    await vi.waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]).not.toHaveProperty('lessonsUsedBefore');
  });

  it('stops at every lesson but one of the package', () => {
    const { dialog, day, more } = open();
    day(past);
    const max = lessonsOf('standard') - 1;
    for (let i = 0; i < max + 3; i += 1) more();
    expect(dialog.getByRole('group', { name: t.salesMoney.usedBefore }).textContent).toContain(String(max));
    expect(dialog.getByRole('button', { name: t.salesMoney.usedBeforeMore }).hasAttribute('disabled')).toBe(true);
  });

  it('without subscriptions.set_start_date: never shown', () => {
    perms.list = [];
    const { day, stepper } = open();
    day(past);
    expect(stepper()).toBeNull();
  });

  it('maps the API refusal through packagePayment.error', async () => {
    const { dialog, day, more, save } = open();
    apiSend.mockImplementation(async (_m: string, path: string) => {
      if (path === '/subscriptions/quote') return WEEKLY.price_source;
      throw new ApiError(400, { code: 'used_before_too_many' });
    });
    day(past);
    more();
    save();
    expect(await dialog.findByText(t.packagePayment.error.used_before_too_many)).toBeTruthy();
  });
});
