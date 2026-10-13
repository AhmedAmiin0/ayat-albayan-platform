import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { templateErrorText } from './api';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// Owner 2026-10-13 («just don't list them, don't disable them»): a template never offered to the
// restricted roles (a booking confirmation or reminder, the PDF report, an own-button one) shows no
// «متاح للمعلمين والمبيعات» switch at all, not a disabled one; every offerable row keeps it.

const BOOKING = template({ key: 'booking_confirmation', meta_name: 'booking_confirmation', sales_starter: true });
const PDF = template({ key: 'report_ready', meta_name: 'report_ready', header_format: 'document' });
const RATING = template({ key: 'lesson_rating', meta_name: 'lesson_rating' });
const INVITE = template({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true });
const RENEWAL = template({ key: 'renewal_due', meta_name: 'renewal_due', status: 'not_submitted' });
const switchFor = (name: string) => t.templates.salesStarterFor.replace('{name}', name);

/** The row and its «متاح للمعلمين والمبيعات» cell (the column's position in the head). */
function rowOf(text: string) {
  const row = screen.getAllByText(text)[0]?.closest('tr');
  const heads = [...document.querySelectorAll('thead th')].map((th) => th.textContent ?? '');
  const cell = row?.querySelectorAll('td')[heads.findIndex((h) => h.includes(t.templates.salesStarter))];
  if (!row || !cell) throw new Error(`no row ${text}`);
  return { row, cell };
}

afterEach(() => apiFetch.mockReset());

describe('template health — the switch only where a template can be offered', () => {
  it.each([
    ['booking_confirmation', t.templates.names.booking_confirmation],
    ['report_ready (PDF)', t.templates.names.report_ready],
    ['lesson_rating (own button)', t.templates.names.lesson_rating],
  ])('%s: no switch, not even a disabled one, and an empty cell without its label', async (_label, name) => {
    routeFetch(apiFetch, [['/messaging/templates', [BOOKING, PDF, RATING, INVITE, RENEWAL]]]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(name);
    const { row, cell } = rowOf(name);
    expect(within(row).queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('checkbox', { name: switchFor(name) })).toBeNull();
    expect(cell.childNodes).toHaveLength(0);
    expect(cell.className).toContain('max-sm:empty:hidden');
  });

  it('free_trial_invite and a not-yet-approved offerable row keep their switch', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [BOOKING, PDF, RATING, INVITE, RENEWAL]]]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(t.templates.names.renewal_due);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    const invite = screen.getByRole('checkbox', { name: switchFor('free_trial_invite') });
    expect([(invite as HTMLInputElement).checked, (invite as HTMLInputElement).disabled]).toEqual([true, false]);
    const renewal = screen.getByRole('checkbox', { name: switchFor(t.templates.names.renewal_due) });
    expect([(renewal as HTMLInputElement).checked, (renewal as HTMLInputElement).disabled]).toEqual([false, false]);
    expect(rowOf(t.templates.names.renewal_due).cell.textContent).toContain(t.templates.salesStarter);
  });

  it('the API refusal to offer one (400 template_not_offerable) reads in Arabic', () => {
    const text = templateErrorText(new ApiError(400, { code: 'template_not_offerable' }));
    expect(text).toBe(t.templates.error.template_not_offerable);
    expect(text).not.toBe(t.common.error);
  });
});
