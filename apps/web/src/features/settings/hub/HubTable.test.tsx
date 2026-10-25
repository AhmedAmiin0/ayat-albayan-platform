import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { answerHub, renderHub } from './hub-test-utils';
import { HubTable } from './HubTable';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const H = t.settingsHub;

describe('HubTable (the five destinations, docs/26b §1)', () => {
  afterEach(() => apiFetch.mockReset());

  it('a captioned table with column and row headers, in hub order', () => {
    answerHub(apiFetch, {});
    renderHub(<HubTable />);
    const table = screen.getByRole('table', { name: H.caption });
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([H.colSection, H.colState, H.colOpen]);
    const rows = within(table).getAllByRole('rowheader');
    expect(rows.map((th) => within(th).getByRole('link').textContent)).toEqual([
      t.settingsValues.title,
      t.settingsPages.communications,
      t.integrations.title,
      H.googleName,
      t.settings.sections.appearance,
    ]);
  });

  it('one real link per row, to its page; «افتح» is only visual', () => {
    answerHub(apiFetch, {});
    renderHub(<HubTable />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/admin/settings/values',
      '/admin/settings/communications',
      '/admin/settings/integrations',
      '/admin/settings/google',
      '/admin/settings/appearance',
    ]);
    expect(screen.getAllByText(H.open).every((el) => el.closest('[aria-hidden="true"]'))).toBe(true);
  });

  it('each row carries its one-line description', () => {
    answerHub(apiFetch, {});
    renderHub(<HubTable />);
    expect(screen.getByText(H.desc.values)).toBeTruthy();
    expect(screen.getByText(H.desc.google)).toBeTruthy();
  });

  it('the head sits on the strong hairline other tables use (no double gold rule)', () => {
    answerHub(apiFetch, {});
    renderHub(<HubTable />);
    for (const th of screen.getAllByRole('columnheader')) {
      expect(th.className).toContain('border-rule-strong');
      expect(th.className).not.toMatch(/border-gold|border-double/);
    }
  });
});
