import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { SALES_QUOTE, student } from '../sales-money-fixture';
import { SalesMoneyFlow } from '../SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => false }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const TRIAL = '7a000000-0000-4000-8000-000000000001';
const OTHER = '7a000000-0000-4000-8000-000000000002';
const TEACHERS = [{ id: TRIAL, name: 'أبرار' }, { id: OTHER, name: 'هدى' }];
const creates = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/subscriptions').map((c) => c[2] as Record<string, unknown>);

function open(teacherId: string | null) {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []], ['/sales/subscriptions/teachers', TEACHERS]]);
  apiSend.mockImplementation(async (_m: string, path: string) => (path.endsWith('/quote') ? SALES_QUOTE : new Promise(() => undefined)));
  renderWithClient(<SalesMoneyFlow start="subscribe" students={[student({ teacher_id: teacherId })]} onClose={vi.fn()} />);
  return within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
}

// Owner 2026-10-29: the assistant assigns the teacher when the student subscribes (the chat opens after).
describe('«المعلم/ة» in the subscribe step', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('defaults to the trial’s teacher and sends it with the package', async () => {
    const dialog = open(TRIAL);
    const select = dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.teacher });
    await dialog.findByRole('option', { name: 'أبرار' });
    expect(select.value).toBe(TRIAL);
    expect(dialog.getByText(t.salesMoney.teacherHint)).toBeTruthy();
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
    await vi.waitFor(() => expect(creates()[0]).toMatchObject({ teacherId: TRIAL }));
  });

  it('another pick is sent; no teacher at all sends none (the chat stays closed)', async () => {
    const dialog = open(TRIAL);
    await dialog.findByRole('option', { name: 'هدى' });
    fireEvent.change(dialog.getByRole('combobox', { name: t.salesMoney.teacher }), { target: { value: OTHER } });
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
    await vi.waitFor(() => expect(creates()[0]).toMatchObject({ teacherId: OTHER }));
  });

  it('a student without a teacher: «لم يُعيَّن معلم/ة بعد», no teacherId', async () => {
    const dialog = open(null);
    expect(dialog.getByRole<HTMLSelectElement>('combobox', { name: t.salesMoney.teacher }).value).toBe('');
    fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).not.toHaveProperty('teacherId');
  });
});
