import { daysBefore, riyadhToday } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { EditStartDateAction } from './EditStartDateAction';

// «تعديل تاريخ البدء» (owner 2026-11-03): subscriptions.edit_terms only; a native date input.
const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['subscriptions.edit_terms'] }));
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiSend,
}));
vi.mock('@/features/people/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const e = t.salesMoney.startDateEdit;
const today = riyadhToday();
const FROM = daysBefore(today, 40);
const TO = daysBefore(today, 10);
const PKG = { id: 'sub-1', status: 'unpaid' as const, starts_on: FROM, lessons_used_before: 0 };
const URL = '/subscriptions/sub-1/start-date';

type Pkg = Partial<Omit<typeof PKG, 'status'>> | { status: 'cancelled' };
function renderAction(pkg: Pkg = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditStartDateAction pkg={{ ...PKG, ...pkg }} />
    </QueryClientProvider>,
  );
}

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: e.action }));
  const dialog = within(screen.getByRole('dialog'));
  return { dialog, input: dialog.getByLabelText<HTMLInputElement>(e.label) };
};

describe('EditStartDateAction', () => {
  beforeEach(() => {
    apiSend.mockReset();
    perms.list = ['subscriptions.edit_terms'];
  });

  it('hidden for a normal assistant (set_start_date only) and on a cancelled package', () => {
    perms.list = ['subscriptions.set_start_date', 'subscriptions.write'];
    renderAction();
    perms.list = ['subscriptions.edit_terms'];
    renderAction({ status: 'cancelled' });
    expect(screen.queryByRole('button', { name: e.action })).toBeNull();
  });

  it('a date input from the stored day, a year back at most; PATCH, then «عُدِّل»', async () => {
    renderAction();
    const { dialog, input } = openDialog();
    expect([input.type, input.value, input.min, input.max]).toEqual([
      'date', FROM, daysBefore(today, 365), '',
    ]);
    const save = dialog.getByRole<HTMLButtonElement>('button', { name: e.save });
    expect(save.disabled).toBe(true);
    fireEvent.change(input, { target: { value: TO } });
    apiSend.mockResolvedValue({ subscription_id: 'sub-1', starts_on: TO });
    fireEvent.click(save);
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', URL, { startsOn: TO }));
    expect(await screen.findByText(e.saved)).toBeTruthy();
  });

  it('lessons counted before: the input stops at yesterday; a 400 reads in Arabic', async () => {
    renderAction({ lessons_used_before: 2 });
    const { dialog, input } = openDialog();
    expect(input.max).toBe(daysBefore(today, 1));
    fireEvent.change(input, { target: { value: TO } });
    apiSend.mockRejectedValue(new ApiError(400, { code: 'used_before_needs_past_start' }));
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    expect(await dialog.findByText(e.errors.used_before_needs_past_start)).toBeTruthy();
  });
});
