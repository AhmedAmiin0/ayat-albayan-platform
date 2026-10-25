import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { LINES } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));

const ROWS = [
  template(),
  template({ key: 'renewal_due', meta_name: 'renewal_due', status: 'not_submitted', quality: null }),
  template({ key: 'follow_up_slots', status: 'rejected', category: 'marketing' }),
];
const names = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent ?? '');
const filterBy = (col: string) => t.table.filterBy.replace('{col}', col);

afterEach(() => apiFetch.mockReset());

describe('template health sort and filters (R-NFR-08, client-side)', () => {
  it('the name header sorts by the Arabic name, asc then desc', async () => {
    routeFetch(apiFetch, [
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', ROWS],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(t.templates.names.renewal_due);
    const shown = ROWS.map((r) => t.templates.names[r.key as keyof typeof t.templates.names]);
    const asc = [...shown].sort(new Intl.Collator('ar', { numeric: true, sensitivity: 'base' }).compare);
    fireEvent.click(screen.getByRole('button', { name: t.templates.name }));
    expect(names().map((n) => asc.find((a) => n.startsWith(a)))).toEqual(asc);
    fireEvent.click(screen.getByRole('button', { name: t.templates.name }));
    expect(names().map((n) => asc.find((a) => n.startsWith(a)))).toEqual([...asc].reverse());
  });

  it('status and category selects keep only the matching rows', async () => {
    routeFetch(apiFetch, [
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', ROWS],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(t.templates.names.renewal_due);
    openFilters();
    fireEvent.change(screen.getByLabelText(filterBy(t.templates.status)), { target: { value: 'rejected' } });
    expect(names()).toHaveLength(1);
    expect(screen.getByText(t.templates.names.follow_up_slots)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(filterBy(t.templates.category)), { target: { value: 'utility' } });
    expect(screen.getByText(t.common.empty)).toBeTruthy();
  });
});
