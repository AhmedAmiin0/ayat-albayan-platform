import { SETTINGS_SECTIONS } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { CATALOGUE_ROUTE, SETTINGS } from '@/test/settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

/** The page's sections as e2e and deep links know them: id, then heading, in page order. */
const IDS = ['messaging', 'schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy', 'sales', 'appearance', 'integrations', 'custom'];
const HEADINGS = [...SETTINGS_SECTIONS.map((s) => t.settings.sections[s]), t.integrations.title, t.config.sections.custom];

async function renderPage() {
  routeFetch(apiFetch, [
    ['/config/meta', { meta: {} }],
    ['/config/custom', []],
    ['/settings/integrations', []],
    ['/settings', SETTINGS],
    CATALOGUE_ROUTE,
    ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ['/messaging/templates', []],
  ]);
  const client = renderWithClient(<SettingsPage />);
  await screen.findByLabelText(t.config.search.label);
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('/admin/settings structure (pinned for e2e, deep links and the index)', () => {
  it('renders the eleven sections in page order, each a region with its settings-<id> ids and its heading', async () => {
    await renderPage();
    const sections = [...document.querySelectorAll('section[id^="settings-"]')];
    expect(sections.map((s) => s.id)).toEqual(IDS.map((id) => `settings-${id}`));
    sections.forEach((section, i) => {
      expect(section.getAttribute('aria-labelledby')).toBe(`settings-${IDS[i]}-title`);
      const heading = within(section as HTMLElement).getAllByRole('heading', { level: 2 })[0];
      expect(heading?.id).toBe(`settings-${IDS[i]}-title`);
      expect(heading?.textContent).toBe(HEADINGS[i]);
      expect(screen.getByRole('region', { name: HEADINGS[i] })).toBe(section);
    });
  });

  it('the index links each section in the same order; #settings-messaging is the first', async () => {
    await renderPage();
    const links = within(screen.getByRole('navigation', { name: t.settings.nav })).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(HEADINGS);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(IDS.map((id) => `#settings-${id}`));
    expect(document.getElementById('settings-messaging')).toBeTruthy();
  });

  it('no role=status while idle; exactly one (the toast) after a save', async () => {
    await renderPage();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    apiSend.mockResolvedValue(SETTINGS);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(1));
    expect(screen.getByRole('status').textContent).toContain(t.settings.saved);
  });
});
