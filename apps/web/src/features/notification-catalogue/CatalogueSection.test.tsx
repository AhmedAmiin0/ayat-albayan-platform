import { catalogueViews, SETTING_DEFAULTS, type NotificationsOverview } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { rowsOf } from './catalogue-tabs';
import { CatalogueSection } from './CatalogueSection';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const c = t.notificationCatalogue;
const OVERVIEW: NotificationsOverview = {
  entries: catalogueViews({
    settings: SETTING_DEFAULTS,
    gateReason: 'switch_off',
    templates: new Map([['report_ready', { status: 'approved', line: 'notifications' }]]),
  }),
  lines: [{ line: 'notifications', display_phone_e164: '+966551234567', verified_name: null, checked_at: '2026-10-22T08:00:00Z' }],
};

function renderSection(overview: NotificationsOverview | Error = OVERVIEW) {
  if (overview instanceof Error) apiFetch.mockImplementation(async (path: string) => (path === '/settings' ? SETTING_DEFAULTS : path === '/settings/integrations' ? [] : Promise.reject(overview)));
  else routeFetch(apiFetch, [['/admin/notifications', overview], ['/settings/integrations', []], ['/settings', SETTING_DEFAULTS]]);
  renderWithClient(<CatalogueSection />);
}

afterEach(() => apiFetch.mockReset());

describe('«ماذا يُرسل ومتى» (read-only)', () => {
  it('lists the guardian rows first, by name with its state, first blocker and number; no switch to press', async () => {
    renderSection();
    const region = await screen.findByRole('region', { name: c.title });
    expect(await within(region).findByText(c.entries.report_ready.name)).toBeTruthy();
    const table = within(region).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(rowsOf(OVERVIEW.entries, 'guardian').length + 1);
    expect(within(region).getByRole('tab', { selected: true }).textContent).toContain(c.audience.guardian);
    const report = region.querySelector('[data-key="report_ready"]') as HTMLElement;
    expect(within(report).getByText(c.states.off)).toBeTruthy();
    expect(within(report).getByText(c.blockers.messaging_off)).toBeTruthy();
    expect(within(report).getByText(c.tags.essential)).toBeTruthy();
    expect(within(report).getByText('+966 55 123 4567')).toBeTruthy();
    expect(within(region).queryAllByRole('checkbox')).toHaveLength(0);
    expect(within(region).getByText(c.readOnly)).toBeTruthy();
  });

  it('one audience at a time: another tab shows its rows only; «يدوي» lists the manual messages', async () => {
    renderSection();
    const region = await screen.findByRole('region', { name: c.title });
    await within(region).findByText(c.entries.report_ready.name);
    fireEvent.click(within(region).getByRole('tab', { name: new RegExp(c.audience.teacher) }));
    expect(within(region).getByText(c.entries.teacher_new_student.name)).toBeTruthy();
    expect(within(region).queryByText(c.entries.report_ready.name)).toBeNull();
    fireEvent.click(within(region).getByRole('tab', { name: new RegExp(c.states.manual) }));
    expect(within(region).getByText(c.entries.inbox_templates.name)).toBeTruthy();
    expect(within(region).queryByText(c.entries.teacher_new_student.name)).toBeNull();
  });

  it('the kept number shows without a check; a line never checked says so', async () => {
    renderSection();
    expect(await screen.findByText(c.notChecked)).toBeTruthy();
    expect(screen.getAllByText('+966 55 123 4567').length).toBeGreaterThan(0);
  });

  it('loading has no role=status (the page owns it); an error says so and can reload', async () => {
    renderSection(new Error('down'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(await screen.findByText(c.loadError)).toBeTruthy();
    apiFetch.mockImplementation(async (path: string) => (path === '/settings' ? SETTING_DEFAULTS : path === '/settings/integrations' ? [] : OVERVIEW));
    fireEvent.click(screen.getByRole('button', { name: c.retry }));
    expect(await screen.findByText(c.entries.report_ready.name)).toBeTruthy();
  });
});
