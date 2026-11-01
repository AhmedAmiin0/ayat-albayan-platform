import { SETTING_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { settingText } from '@/components/settings/search/setting-text';
import { t } from '@/lib/i18n/i18n';
import { searchHub } from './hub-search';

const H = t.settingsHub;
const byId = (query: string, id: string) => searchHub(query).find((h) => h.id === id);

describe('searchHub (docs/26b §1: labels, descriptions, keys and module pages)', () => {
  it('an empty search finds nothing (the table shows instead)', () => {
    expect(searchHub('')).toEqual([]);
    expect(searchHub('   ')).toEqual([]);
  });

  it('every one of the 54 settings is found by its key and links somewhere under «القيم»', () => {
    expect(SETTING_KEYS).toHaveLength(54);
    for (const key of SETTING_KEYS) {
      const hit = byId(key, `setting:${key}`);
      expect(hit?.href, key).toMatch(/^\/admin\/settings\/values\?group=/);
      expect(hit?.settingKey).toBe(key);
    }
  });

  it('an editable key opens its group with the search', () => {
    const hit = byId('academy_whatsapp_e164', 'setting:academy_whatsapp_e164');
    expect(hit).toEqual({
      id: 'setting:academy_whatsapp_e164',
      label: settingText('academy_whatsapp_e164').label,
      where: `${t.settingsValues.title} › ${H.groups.academy}`,
      href: '/admin/settings/values?group=academy&q=academy_whatsapp_e164',
      settingKey: 'academy_whatsapp_e164',
    });
  });

  it('the search text is encoded in the link', () => {
    const label = settingText('booking_horizon_weeks').label;
    const hit = byId(` ${label} `, 'setting:booking_horizon_weeks');
    expect(hit?.href).toBe(`/admin/settings/values?${new URLSearchParams({ group: 'schedule', q: label }).toString()}`);
  });

  it('an owned key opens its read-only group without the search', () => {
    expect(byId('messaging_enabled', 'setting:messaging_enabled')?.href).toBe('/admin/settings/values?group=sending');
    expect(byId('follow_up_hours', 'setting:follow_up_hours')?.href).toBe('/admin/settings/values?group=notifications');
  });

  it('finds a setting by its description (hint)', () => {
    const hint = settingText('upload_max_mb').hint;
    expect(hint).toBeTruthy();
    expect(searchHub(hint ?? '').some((h) => h.id === 'setting:upload_max_mb')).toBe(true);
  });

  it('module pages link to their page or tab', () => {
    expect(byId(t.numbers.title, 'page:numbers')?.href).toBe('/admin/settings/communications?tab=numbers');
    expect(byId(t.templates.title, 'page:templates')?.href).toBe('/admin/settings/communications?tab=templates');
    const rules = byId(t.notificationRules.title, 'page:catalogue');
    expect(rules?.href).toBe('/admin/settings/communications?tab=catalogue');
    expect(rules?.label).toBe(t.notificationRules.title);
    expect(byId(t.notificationCatalogue.title, 'page:catalogue')?.href).toBe('/admin/settings/communications?tab=catalogue');
    expect(byId(t.templates.settings.lines.title, 'page:lines')?.href).toBe('/admin/settings/communications?tab=numbers');
    expect(byId(t.integrations.keys.FX_API_URL.label, 'page:integrations')?.href).toBe('/admin/settings/integrations');
    expect(byId(t.settings.theme, 'page:appearance')?.href).toBe('/admin/settings/appearance');
    expect(byId('Google', 'page:google')?.href).toBe('/admin/settings/google');
  });

  it('the WhatsApp groups of «التكاملات» are found on «التواصل» (docs/23 phase 6)', () => {
    expect(byId(t.integrations.keys.WA_WABA_ID.label, 'page:lines')?.href).toBe('/admin/settings/communications?tab=numbers');
    expect(byId(t.integrations.keys.WA_ALLOWED_RECIPIENTS.label, 'page:safety')?.href).toBe('/admin/settings/communications?tab=safety');
    expect(byId('KAPSO_API_KEY', 'page:safety')?.label).toBe(t.settingsPages.communicationsTabs.safety);
    expect(byId('KAPSO_API_KEY', 'page:integrations')).toBeUndefined();
  });

  it('settings come before module pages; nonsense finds nothing', () => {
    const ids = searchHub('واتساب').map((h) => h.id);
    const firstPage = ids.findIndex((id) => id.startsWith('page:'));
    expect(ids.slice(firstPage).every((id) => id.startsWith('page:'))).toBe(true);
    expect(searchHub('zzzz-no-such-setting')).toEqual([]);
  });
});
