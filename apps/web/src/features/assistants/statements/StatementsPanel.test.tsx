import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentMonth } from '@/features/payouts/api';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { ASSISTANT, STATEMENT } from '../fixtures';
import { StatementsPanel } from './StatementsPanel';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const ALL = { write: true, approve: true };
const B = { ...ASSISTANT, id: 'a2', name: 'سارة' };

function renderPanel(rows = [STATEMENT], can = ALL) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StatementsPanel assistants={[ASSISTANT, B]} can={can} />
    </QueryClientProvider>,
  );
}

describe('StatementsPanel (R-ASST-03)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    apiSend.mockResolvedValue(STATEMENT);
  });

  it('loads the current month and shows the frozen totals one line per currency', async () => {
    renderPanel();
    const row = (await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' })).closest('tr');
    if (!row) throw new Error('row missing');
    expect(apiFetch).toHaveBeenCalledWith(`/assistant-pay/statements?month=${currentMonth()}`);
    const lines = [...row.querySelectorAll('li')].map((li) => li.firstElementChild?.textContent);
    expect(lines).toEqual([moneyText(3000, 'EGP'), moneyText(40, 'SAR')]);
    expect(row.textContent).toContain(`الراتب ${moneyText(0, 'SAR')} + العمولات ${moneyText(50, 'SAR')} + التسويات ${moneyText(-10, 'SAR')} = ${moneyText(40, 'SAR')}`);
  });

  it('draft → «اعتماد» calls approve', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.approve }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/approve', undefined));
  });

  it('approved → «دُفعت» asks for method and day, then pays with no receipt path', async () => {
    renderPanel([{ ...STATEMENT, status: 'approved' }]);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.markPaid }));
    fireEvent.click(await screen.findByRole('button', { name: t.finance.confirmPaid }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/pay', expect.objectContaining({ method: 'bank', receiptPath: null, note: null })),
    );
  });

  it('approved → «إعادة فتح»; paid → «إلغاء الدفع» needs a reason', async () => {
    renderPanel([{ ...STATEMENT, status: 'approved' }, { ...STATEMENT, id: 'st2', status: 'paid', paid_at: '2026-10-02T09:00:00Z' }]);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.reopen }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.finance.reopen }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/reopen', undefined));
    fireEvent.click(await screen.findByRole('button', { name: t.finance.unpay }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    expect(await within(dialog).findByText(t.finance.reasonRequired)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), { target: { value: 'دُفع مرتين' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st2/unpay', { reason: 'دُفع مرتين' }));
  });

  it('«التفاصيل» lists the salary, the commission with its student and the adjustment reason', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: t.assistants.statements.details }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.assistants.statements.lineSalary)).toBeTruthy();
    expect(within(dialog).getByText(/عمولة سهيلة/)).toBeTruthy();
    expect(within(dialog).getByText('تسوية: خصم تجريبي')).toBeTruthy();
  });

  it('the generate button builds a draft per assistant, skipping one already approved', async () => {
    renderPanel([{ ...STATEMENT, status: 'approved' }]);
    await screen.findByText(t.enums.payoutStatus.approved, { selector: 'td *' });
    fireEvent.click(screen.getByRole('button', { name: t.assistants.statements.regenerate }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements', { assistantId: 'a2', month: currentMonth() }),
    );
    expect(apiSend).not.toHaveBeenCalledWith('POST', '/assistant-pay/statements', expect.objectContaining({ assistantId: 'a1' }));
  });

  it('without write or approve permission the row offers only the details', async () => {
    renderPanel([STATEMENT], { write: false, approve: false });
    await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' });
    expect(screen.queryByRole('button', { name: t.payouts.approve })).toBeNull();
    expect(screen.queryByRole('button', { name: t.assistants.statements.generate })).toBeNull();
    expect(screen.getByRole('button', { name: t.assistants.statements.details })).toBeTruthy();
  });

  it('a writer without the approve permission can pay but not reopen or un-pay (the API refuses both)', async () => {
    renderPanel(
      [{ ...STATEMENT, status: 'approved' }, { ...STATEMENT, id: 'st2', status: 'paid', paid_at: '2026-10-02T09:00:00Z' }],
      { write: true, approve: false },
    );
    expect(await screen.findByRole('button', { name: t.payouts.markPaid })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.finance.reopen })).toBeNull();
    expect(screen.queryByRole('button', { name: t.finance.unpay })).toBeNull();
  });

  it('a month without statements says so', async () => {
    renderPanel([]);
    expect(await screen.findByText(t.assistants.statements.empty)).toBeTruthy();
  });
});
