import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { numberView } from '@/features/numbers/numbers.fixture';
import { t } from '@/lib/i18n/i18n';
import { LINES } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['settings.read'] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

// «يُرسل من» when the template's number is not in the list (deleted, unreadable, still loading).

const s = t.templates.sendFrom;
const NAME = t.templates.names.booking_confirmation_plain;
const GONE = template({ number_id: 'n-gone', numbers: [] });

function renderWith(numbers = [numberView()]) {
  routeFetch(apiFetch, [
    ['/admin/numbers', numbers],
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [GONE]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
}

afterEach(() => {
  apiFetch.mockReset();
  perms.list = ['settings.read'];
});

describe('template health — «يُرسل من» with an unknown number', () => {
  it('read-only: a number not in the list is «رقم غير معروف», never the role default', async () => {
    renderWith();
    await waitFor(() => expect(screen.getAllByText(s.unknownNumber).length).toBeGreaterThan(0));
    expect(screen.queryByText(s.roleDefault)).toBeNull();
  });

  it('without settings.read the numbers are not fetched and the label stays neutral', async () => {
    perms.list = [];
    renderWith();
    await waitFor(() => expect(screen.getAllByText(s.unknownNumber).length).toBeGreaterThan(0));
    expect(apiFetch.mock.calls.some(([p]) => p === '/admin/numbers')).toBe(false);
  });

  it('editable: the missing number is its own disabled option, selected; a stopped number is marked', async () => {
    perms.list = ['settings.read', 'templates.manage'];
    renderWith([numberView(), numberView({ id: 'n-off', label: 'Off line', enabled: false, is_default: false })]);
    const select = await screen.findByRole('combobox', { name: s.labelFor.replace('{name}', NAME) });
    const options = await within(select).findAllByRole('option');
    const texts = options.map((o) => o.textContent);
    expect(texts[1]).toBe(s.unknownNumber);
    expect((options[1] as HTMLOptionElement).disabled).toBe(true);
    expect((select as HTMLSelectElement).value).toBe('n-gone');
    const off = s.option.replace('{label}', 'Off line').replace('{role}', t.numbers.purpose.notifications);
    expect(texts).toContain(`${off} ${s.disabledMark}`);
    expect(screen.getAllByText(`${s.header}:`, { exact: false }).length).toBeGreaterThan(0);
  });
});
