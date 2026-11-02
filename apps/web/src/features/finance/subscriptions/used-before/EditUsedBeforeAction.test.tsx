import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { EditUsedBeforeAction } from './EditUsedBeforeAction';

// «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02): admins and assistants
// (subscriptions.set_start_date).
const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['subscriptions.set_start_date'] }));
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));
vi.mock('@/features/people/auth', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const e = t.salesMoney.usedBeforeEdit;
const RESULT = { subscription_id: 'sub-1', lessons_total: 8, lessons_used_before: 6, lessons_used: 6, remaining: 2 };
// 8 lessons, 2 days a week: at most 6; 1 counted already (before the platform), 0 on the platform.
const PKG = { id: 'sub-1', lessons_total: 8, lessons_used: 1, lessons_used_before: 1, status: 'unpaid' as const };

function renderAction(pkg: Partial<typeof PKG> | { status: 'cancelled' } = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditUsedBeforeAction pkg={{ ...PKG, ...pkg }} />
    </QueryClientProvider>,
  );
}

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: e.action }));
  return within(screen.getByRole('dialog'));
};
const more = (d: ReturnType<typeof openDialog>) => d.getByRole('button', { name: t.salesMoney.usedBeforeMore });

describe('EditUsedBeforeAction', () => {
  beforeEach(() => {
    apiSend.mockReset();
    perms.list = ['subscriptions.set_start_date'];
  });

  it('hidden without subscriptions.set_start_date and on a cancelled package', () => {
    perms.list = [];
    renderAction();
    expect(screen.queryByRole('button', { name: e.action })).toBeNull();
    perms.list = ['subscriptions.set_start_date'];
    renderAction({ status: 'cancelled' });
    expect(screen.queryByRole('button', { name: e.action })).toBeNull();
  });

  it('− / + from the current number, bounded by usedBeforeEditMax, then PATCH and «عُدِّل»', async () => {
    renderAction();
    const dialog = openDialog();
    expect(dialog.getByText(e.current.replace('{n}', '1'))).toBeTruthy();
    for (let i = 0; i < 9; i += 1) fireEvent.click(more(dialog));
    apiSend.mockResolvedValue(RESULT);
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/subscriptions/sub-1/lessons-used-before', { lessonsUsedBefore: 6 }),
    );
    expect(await screen.findByText(e.saved)).toBeTruthy();
  });

  it('the lessons already held on the platform lower the bound (5 of 8 held: at most 3)', async () => {
    renderAction({ lessons_used: 5, lessons_used_before: 0 });
    const dialog = openDialog();
    for (let i = 0; i < 9; i += 1) fireEvent.click(more(dialog));
    apiSend.mockResolvedValue(RESULT);
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', expect.any(String), { lessonsUsedBefore: 3 }));
  });

  it('a booked course: the 409 reads in Arabic and the dialog stays', async () => {
    renderAction();
    const dialog = openDialog();
    fireEvent.click(more(dialog));
    apiSend.mockRejectedValue(new ApiError(409, { code: 'used_before_course_booked' }));
    fireEvent.click(dialog.getByRole('button', { name: e.save }));
    expect(await dialog.findByText(e.errors.used_before_course_booked)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('the same number: «حفظ» stays off', () => {
    renderAction();
    const save = openDialog().getByRole('button', { name: e.save });
    expect((save as HTMLButtonElement).disabled).toBe(true);
  });
});
