import { catalogueViews, SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const p = t.settingsPages;
const s = t.templates.settings;
const tab = (name: string) => screen.getByRole('tab', { name });
const CATALOGUE = {
  entries: catalogueViews({ settings: SETTING_DEFAULTS, gateReason: 'switch_off', templates: new Map() }),
  lines: [],
};

afterEach(() => apiFetch.mockReset());

describe('«التواصل» (/admin/settings/communications)', () => {
  it('one title, the way back to «الإعدادات», and the sending state in the head', async () => {
    renderCommunications({ apiFetch });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(p.communications);
    const crumbs = screen.getByRole('navigation', { name: p.crumbs });
    expect(within(crumbs).getByRole('link', { name: t.settings.title }).getAttribute('href')).toMatch(/^\/admin\/settings\??$/);
    const state = await screen.findByRole('group', { name: p.sendingNow });
    expect(state.textContent).toBe(p.sendingState.replace('{state}', s.off));
  });

  it('six tabs, «نظرة عامة» first and selected: the switches, nothing of the other tabs', async () => {
    renderCommunications({ apiFetch });
    const tabs = within(screen.getByRole('tablist', { name: p.tabs })).getAllByRole('tab');
    const ct = p.communicationsTabs;
    expect(tabs.map((x) => x.textContent)).toEqual([ct.overview, ct.numbers, t.notificationRules.tabLabel, ct.templates, ct.savedReplies, ct.safety]);
    expect(tab(ct.overview).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByRole('button', { name: s.enableTitle })).toBeTruthy();
    expect(screen.getByText(s.autoMessages)).toBeTruthy();
    expect(screen.getByRole('tabpanel', { name: ct.overview })).toBeTruthy();
    expect(screen.queryByRole('region', { name: t.notificationRules.title })).toBeNull();
    // The feedback mode is the «أزرار تقييم الحلقة» row of «الإشعارات» now, not a switch here.
    expect(screen.queryByText(s.feedbackMode)).toBeNull();
    expect(screen.queryByRole('heading', { name: t.templates.title })).toBeNull();
    // «مواعيد الرسائل» is gone: its two values are edited in «القيم» › «الرسائل».
    expect(screen.queryByRole('tab', { name: ct.timing })).toBeNull();
    expect(screen.queryByLabelText(t.settings.reminderLookaheadHours)).toBeNull();
  });

  it('«الإشعارات» (tab value catalogue): the catalogue (guardian first, report_ready in view), no timing form', async () => {
    renderCommunications({ apiFetch, catalogue: CATALOGUE });
    fireEvent.click(tab(t.notificationRules.tabLabel));
    const region = await screen.findByRole('region', { name: t.notificationRules.title });
    await within(region).findByText(t.notificationCatalogue.entries.report_ready.name);
    expect(region.querySelector('[data-key="report_ready"]')).toBeTruthy();
    expect(screen.queryByLabelText(s.followUpHours)).toBeNull();
    expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
  });

  it('?audience= (a «ماذا يُرسل الآن» row) opens «الإشعارات» on that audience', async () => {
    renderCommunications({ apiFetch, catalogue: CATALOGUE, tab: 'catalogue', audience: 'teacher' });
    await screen.findByRole('region', { name: t.notificationRules.title });
    const audience = t.notificationCatalogue.audience;
    const selected = await screen.findByRole('tab', { name: new RegExp(audience.teacher), selected: true });
    expect(selected).toBeTruthy();
    expect(screen.getByRole('tab', { name: new RegExp(audience.guardian) }).getAttribute('aria-selected')).toBe('false');
  });

  it('«الأرقام»: the numbers and the WhatsApp lines', async () => {
    renderCommunications({ apiFetch, tab: 'numbers' });
    expect(await screen.findByRole('heading', { name: t.numbers.title })).toBeTruthy();
    expect(screen.getByRole('heading', { name: s.lines.title })).toBeTruthy();
    expect(screen.getByRole('button', { name: s.lines.check })).toBeTruthy();
    expect(screen.queryByRole('button', { name: s.enableTitle })).toBeNull();
    // The legacy line rows of «التكاملات», folded (still read while comms_source = legacy).
    const legacy = screen.getByText(t.communicationsHub.linesLegacyTitle, { selector: 'summary' }).closest('details');
    expect(legacy?.open).toBe(false);
  });

  it('«القوالب»: the templates per number, and the sending state still in the head', async () => {
    renderCommunications({ apiFetch, tab: 'templates' });
    expect(await screen.findByRole('heading', { name: t.templates.title })).toBeTruthy();
    expect(await screen.findAllByTestId('template-line')).toHaveLength(2);
    expect(screen.getByRole('group', { name: p.sendingNow })).toBeTruthy();
  });

  it('no role=status at rest on any tab', async () => {
    renderCommunications({ apiFetch });
    await screen.findByRole('button', { name: s.enableTitle });
    for (const name of [p.communicationsTabs.numbers, t.notificationRules.tabLabel, p.communicationsTabs.templates, p.communicationsTabs.safety]) {
      fireEvent.click(tab(name));
      expect(screen.queryAllByRole('status')).toHaveLength(0);
    }
  });
});
