import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { EditUsedBeforeAction } from './EditUsedBeforeAction';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): admins and assistants
// (subscriptions.set_start_date); the dialog reads GET …/lessons-used-before first.
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['subscriptions.set_start_date'] }));
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
  apiSend,
}));
vi.mock('@/features/people/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const e = t.salesMoney.usedBeforeEdit;
const PKG = { id: 'sub-1', lessons_used_before: 1, status: 'unpaid' as const, starts_on: '2026-01-01' };
const STATE = { subscription_id: 'sub-1', lessons_used_before: 1, max: 6, blocked: null };
const RESULT = { subscription_id: 'sub-1', lessons_total: 8, lessons_used_before: 6, lessons_used: 6, remaining: 2 };
const URL = '/subscriptions/sub-1/lessons-used-before';

type Pkg = Partial<Omit<typeof PKG, 'status'>> | { status: 'cancelled' };
function renderAction(pkg: Pkg = {}, state: object = STATE) {
  apiFetch.mockResolvedValue({ ...STATE, ...state });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditUsedBeforeAction pkg={{ ...PKG, ...pkg }} />
    </QueryClientProvider>,
  );
}

const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: e.action }));
  const dialog = within(screen.getByRole('dialog'));
  await dialog.findByText(e.current.replace('{n}', '1'));
  return dialog;
};
const press = (d: Awaited<ReturnType<typeof openDialog>>, name: string, times = 1) => {
  for (let i = 0; i < times; i += 1) fireEvent.click(d.getByRole('button', { name }));
};

describe('EditUsedBeforeAction', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    perms.list = ['subscriptions.set_start_date'];
  });

  it('hidden without the key, on a cancelled package, and on a future one with nothing counted', () => {
    perms.list = [];
    renderAction();
    perms.list = ['subscriptions.set_start_date'];
    renderAction({ status: 'cancelled' });
    renderAction({ starts_on: '2999-01-01', lessons_used_before: 0 });
    expect(screen.queryByRole('button', { name: e.action })).toBeNull();
  });

  it('reads the state, − / + up to its max, PATCH, then «عُدِّل»', async () => {
    renderAction();
    const dialog = await openDialog();
    expect(apiFetch).toHaveBeenCalledWith(URL);
    press(dialog, t.salesMoney.usedBeforeMore, 9);
    apiSend.mockResolvedValue(RESULT);
    press(dialog, e.save);
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', URL, { lessonsUsedBefore: 6 }));
    expect(await screen.findByText(e.saved)).toBeTruthy();
  });

  it('a booked course: said at once, no stepper, no «حفظ»', async () => {
    renderAction({}, { blocked: 'used_before_course_booked' });
    fireEvent.click(screen.getByRole('button', { name: e.action }));
    const dialog = within(screen.getByRole('dialog'));
    expect(await dialog.findByText(e.errors.used_before_course_booked)).toBeTruthy();
    expect(dialog.queryByRole('button', { name: e.save })).toBeNull();
  });

  it('a future start with 2 counted (max 0): starts at 0 and saves 0', async () => {
    renderAction({ starts_on: '2999-01-01', lessons_used_before: 2 }, { lessons_used_before: 2, max: 0 });
    fireEvent.click(screen.getByRole('button', { name: e.action }));
    const dialog = within(screen.getByRole('dialog'));
    const save = await dialog.findByRole('button', { name: e.save });
    apiSend.mockResolvedValue({ ...RESULT, lessons_used_before: 0 });
    fireEvent.click(save);
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', URL, { lessonsUsedBefore: 0 }));
  });

  it('the same number: «حفظ» stays off; a 400 reads in Arabic and the dialog stays', async () => {
    renderAction();
    const dialog = await openDialog();
    expect(dialog.getByRole<HTMLButtonElement>('button', { name: e.save }).disabled).toBe(true);
    press(dialog, t.salesMoney.usedBeforeMore);
    apiSend.mockRejectedValue(new ApiError(400, { code: 'used_before_needs_past_start' }));
    press(dialog, e.save);
    expect(await dialog.findByText(e.errors.used_before_needs_past_start)).toBeTruthy();
  });
});
