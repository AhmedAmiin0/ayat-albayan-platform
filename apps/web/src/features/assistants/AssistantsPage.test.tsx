import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AssistantDetailPage } from './AssistantDetailPage';
import { AssistantsPage } from './AssistantsPage';
import { ASSISTANT, COMMISSION, STATEMENT } from './fixtures';

const apiFetch = vi.hoisted(() => vi.fn());
const held = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: held.list, can: (p: string) => held.list.includes(p) }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const NEW = { id: 'a2', name: 'سارة', terms: { assistant_id: 'a2', salary: null, commission: { type: 'fixed' as const, value: 50, currency: 'SAR', starts_on: '2026-10-01' } } };

function wrap(ui: React.ReactNode) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/assistant-pay/assistants')) return [ASSISTANT, NEW];
    if (path.startsWith('/assistant-pay/commissions')) return [COMMISSION];
    return [STATEMENT];
  });
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

describe('AssistantsPage (R-ASST-05)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    held.list = ['assistantpay.read', 'assistantpay.write', 'assistantpay.approve'];
  });

  it('lists each assistant with salary and commission, and links to their page', async () => {
    wrap(<AssistantsPage />);
    const link = await screen.findByRole('link', { name: 'الزهراء' });
    expect(link.getAttribute('href')).toBe('/admin/assistants/a1');
    const row = link.closest('tr');
    expect(row?.textContent).toContain('10% من سعر الاشتراك');
    expect(row?.textContent).toContain('3,000');
    const other = screen.getByRole('link', { name: 'سارة' }).closest('tr');
    expect(other?.textContent).toContain(t.assistants.notSet);
    expect(other?.textContent).toContain('عن كل طالب');
  });

  it('the tabs switch to the commission ledger and to the statements', async () => {
    wrap(<AssistantsPage />);
    await screen.findByRole('link', { name: 'الزهراء' });
    fireEvent.click(screen.getByRole('tab', { name: t.assistants.tabs.commissions }));
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: t.assistants.tabs.statements }));
    expect(await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' })).toBeTruthy();
  });
});

describe('AssistantDetailPage', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    held.list = ['assistantpay.read', 'assistantpay.write'];
  });

  it('shows the terms editor with the ledger and statements of this assistant only', async () => {
    wrap(<AssistantDetailPage assistantId="a1" />);
    expect(await screen.findByRole('form', { name: t.assistants.terms.title })).toBeTruthy();
    await screen.findByText('سهيلة');
    expect(apiFetch).toHaveBeenCalledWith('/assistant-pay/commissions?assistantId=a1');
    await vi.waitFor(() =>
      expect(apiFetch.mock.calls.some(([p]) => /^\/assistant-pay\/statements\?assistantId=a1&month=/.test(String(p)))).toBe(true),
    );
  });

  it('read-only admins see the terms as text, not a form', async () => {
    held.list = ['assistantpay.read'];
    wrap(<AssistantDetailPage assistantId="a1" />);
    expect(await screen.findByText('10% من سعر الاشتراك')).toBeTruthy();
    expect(screen.queryByRole('form', { name: t.assistants.terms.title })).toBeNull();
  });

  it('an unknown assistant is not found', async () => {
    wrap(<AssistantDetailPage assistantId="nope" />);
    expect(await screen.findByText(t.assistants.notFound)).toBeTruthy();
  });
});
