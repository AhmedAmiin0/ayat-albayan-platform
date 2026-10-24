import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { numberView } from '@/features/numbers/numbers.fixture';
import { t } from '@/lib/i18n';
import { LINES } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['settings.read'], can: (p: string) => p === 'settings.read' }),
}));

// «يُرسل من» without templates.manage: the number as text, and the per-number approval chips.

const s = t.templates.sendFrom;
const st = t.enums.templateStatus;
const NAME = t.templates.names.booking_confirmation_plain;
const NUMBERS = [
  numberView({ id: 'n-a', label: 'Line A' }),
  numberView({ id: 'n-b', label: 'Line B', is_default: false, fallback_rank: 1 }),
  numberView({ id: 'n-c', label: 'Line C', is_default: false, fallback_rank: 2 }),
  numberView({ id: 'n-d', label: 'Line D', is_default: false, fallback_rank: 3 }),
];
const at = { last_checked_at: null, last_error: null };
const BOOKING = template({
  number_id: 'n-b',
  numbers: [
    { number_id: 'n-b', status: 'pending', ...at },
    { number_id: 'n-c', status: 'rejected', ...at },
  ],
});
const chip = (label: string, status: string) => s.approvalChip.replace('{label}', label).replace('{status}', status);

afterEach(() => apiFetch.mockReset());

describe('template health — «يُرسل من» read-only', () => {
  it('shows the number as text (no select) and one chip per number with its state', async () => {
    routeFetch(apiFetch, [
      ['/admin/numbers', NUMBERS],
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [BOOKING]],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    const list = within(await screen.findByRole('list', { name: s.approvalsFor.replace('{name}', NAME) }));
    expect(screen.queryByRole('combobox', { name: s.labelFor.replace('{name}', NAME) })).toBeNull();
    expect(screen.getAllByText(s.option.replace('{label}', 'Line B').replace('{role}', t.numbers.purpose.notifications)).length).toBeGreaterThan(0);
    expect(list.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      t.notificationRules.approval.some,
      chip('Line B', st.pending),
      chip('Line A', st.approved),
      chip('Line C', st.rejected),
      chip('Line D', s.notSynced),
    ]);
  });

  it('an older API (no number_id, no numbers[]) shows the role default and no chips', async () => {
    routeFetch(apiFetch, [
      ['/admin/numbers', NUMBERS],
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [template()]],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    expect((await screen.findAllByText(s.roleDefault)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('list', { name: s.approvalsFor.replace('{name}', NAME) })).toBeNull();
  });
});
