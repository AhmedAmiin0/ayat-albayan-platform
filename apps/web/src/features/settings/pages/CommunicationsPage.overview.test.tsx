import { catalogueViews, formatPhone, SETTING_DEFAULTS } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { renderCommunications } from './communications-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/inbox/test-utils')).MockLink,
}));

const h = t.communicationsHub;
const n = t.numbers;
const table = (caption: string) => screen.getByRole('table', { name: caption });
const CATALOGUE = {
  entries: catalogueViews({ settings: SETTING_DEFAULTS, gateReason: 'switch_off', templates: new Map() }),
  lines: [],
};

afterEach(() => apiFetch.mockReset());

// docs/23 §2d tab 1: the switches, then short read-only tables and the families' number.
describe('«التواصل» › «نظرة عامة»', () => {
  it('the numbers table: name, phone (LTR), role, provider and the last check; a link to «الأرقام»', async () => {
    renderCommunications({ apiFetch });
    const numbers = await screen.findByRole('table', { name: h.numbersTitle });
    const rows = within(numbers).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const first = rows[0] as HTMLElement;
    expect(within(first).getByRole('rowheader').textContent).toBe('Notifications line');
    expect(within(first).getByText(formatPhone('+15550001111')).closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(within(first).getByText(n.purpose.notifications)).toBeTruthy();
    expect(within(first).getByText(n.health.ok)).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText(n.chips.notChecked)).toBeTruthy();
    expect(screen.getByRole('link', { name: h.numbersOpen }).getAttribute('href')).toBe('/admin/settings/communications?tab=numbers');
  });

  it('«ماذا يُرسل الآن»: one row per audience with its counts, each opening «الإشعارات»', async () => {
    renderCommunications({ apiFetch, catalogue: CATALOGUE });
    await screen.findByRole('table', { name: h.whatCaption });
    const rows = within(table(h.whatCaption)).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(Object.values(t.notificationCatalogue.audience));
    const guardian = rows[0] as HTMLElement;
    const guardians = CATALOGUE.entries.filter((e) => !e.manual && e.audience === 'guardian');
    const cells = within(guardian).getAllByRole('cell').map((c) => c.textContent);
    const on = guardians.filter((e) => e.state === 'on').length;
    expect(cells.slice(0, 2)).toEqual([String(on), String(guardians.length - on)]);
    const open = within(guardian).getByRole('link', { name: h.openAudience.replace('{audience}', t.notificationCatalogue.audience.guardian) });
    expect(open.getAttribute('href')).toBe('/admin/settings/communications?tab=catalogue');
  });

  it('«الرقم المعلن للأسر»: read-only, LTR, edited in «القيم» › «الأكاديمية»', async () => {
    renderCommunications({ apiFetch, settings: { academy_whatsapp_e164: '+966566101447' } });
    const region = await screen.findByRole('region', { name: h.publicNumber });
    expect(within(region).getByText(formatPhone('+966566101447')).getAttribute('dir')).toBe('ltr');
    expect(within(region).queryByRole('textbox')).toBeNull();
    expect(within(region).getByRole('link', { name: h.publicNumberEdit }).getAttribute('href')).toBe('/admin/settings/values?group=academy');
  });

  it('the switches sit under their own heading, and nothing is written on open', async () => {
    renderCommunications({ apiFetch });
    const region = await screen.findByRole('region', { name: h.switchesTitle });
    expect(within(region).getByRole('button', { name: t.templates.settings.enableTitle })).toBeTruthy();
    expect(within(region).getByRole('button', { name: t.templates.settings.autoEnable })).toBeTruthy();
    expect(apiFetch.mock.calls.every(([, init]) => init === undefined)).toBe(true);
  });
});
