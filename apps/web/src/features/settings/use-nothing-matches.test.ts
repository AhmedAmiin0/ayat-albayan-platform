import { INTEGRATION_KEYS, SETTING_KEYS, type CustomConfigView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { matchesSetting, matchesText } from '@/components/settings/settings-search';
import { matchesCustom } from '@/features/custom-config/custom-form';
import { integrationsMatch } from '@/features/integrations/integrations-form';
import { linesMatch } from '@/features/messaging/lines-match';
import { catalogueMatch } from '@/features/notification-catalogue/catalogue-match';
import { templatesMatch } from '@/features/templates/templates-match';
import { t } from '@/lib/i18n';
import { nothingMatches } from './use-nothing-matches';

/** The legacy SettingsPage.useNothingMatches, as it read before PAGE_SECTIONS (minus the fetch). */
function legacyNothingMatches(query: string, custom: readonly CustomConfigView[]): boolean {
  if (query.trim() === '') return false;
  return (
    !SETTING_KEYS.some((k) => matchesSetting(k, query)) &&
    !matchesText(`${t.settings.theme} ${t.settings.themeHint}`, query) &&
    !integrationsMatch(query) &&
    !linesMatch(query) &&
    !catalogueMatch(query) &&
    !templatesMatch(query) &&
    !custom.some((e) => matchesCustom(e, query))
  );
}

const ENTRY: CustomConfigView = { key: 'promo_banner', value: { text: 'hi' }, description: 'شعار الصفحة', isPublic: true, updatedAt: '2026-10-05T10:00:00Z', updatedBy: null };

const QUERIES: readonly string[] = [
  '',
  '   ',
  t.settings.bookingHorizonWeeks, // a setting label
  t.settings.hints.joinOpensBeforeMin, // a hint
  'late_cancel_hours', // a row key
  t.settings.lateCancel, // a nullable number's switch words
  'messaging_enabled', // a switch that saves on its own
  t.templates.settings.messagingEnabled,
  'sales_auto_assign',
  t.sales.assign.auto,
  t.settings.theme, // the theme row
  t.settings.themeHint,
  t.templates.settings.lines.title, // lines
  t.notificationCatalogue.intro, // the catalogue
  t.templates.perNumber.sync, // a template
  t.templates.title,
  'WA_WABA_ID', // an integration key
  t.integrations.keys.WA_WABA_ID.label,
  'promo_banner', // a custom entry, by key
  'شعار', // and by description
  'retention',
  'zzzz-nothing', // nonsense
  'qqq',
];

describe('nothingMatches (the «لا توجد إعدادات تطابق بحثك.» note)', () => {
  it.each(QUERIES)('agrees with the legacy predicate for %j (with and without custom entries)', (query) => {
    expect(nothingMatches(query, [ENTRY])).toBe(legacyNothingMatches(query, [ENTRY]));
    expect(nothingMatches(query, [])).toBe(legacyNothingMatches(query, []));
  });

  it('a search for any setting key or integration key always finds something', () => {
    for (const k of SETTING_KEYS) expect(nothingMatches(k, [])).toBe(false);
    for (const { key } of INTEGRATION_KEYS) expect(nothingMatches(key, [])).toBe(false);
  });

  it('the table covers both answers', () => {
    expect(nothingMatches('zzzz-nothing', [ENTRY])).toBe(true);
    expect(nothingMatches('promo_banner', [ENTRY])).toBe(false);
    expect(nothingMatches('promo_banner', [])).toBe(true);
    expect(nothingMatches('', [])).toBe(false);
  });
});
