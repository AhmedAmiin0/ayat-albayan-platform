import { OWNED_VALUE_GROUPS, SETTING_KEYS, VALUE_GROUPS, type SettingKey } from '@ab/shared';
import { matchesSetting, matchesText } from '@/components/settings/search/settings-search';
import { settingText } from '@/components/settings/search/setting-text';
import { groupsMatch, INTEGRATIONS_PAGE_GROUPS, LEGACY_LINE_GROUPS, SAFETY_GROUPS } from '@/features/integrations/integration-places';
import { linesMatch } from '@/features/messaging/lines-match';
import { catalogueMatch } from '@/features/notification-catalogue/catalogue-match';
import { numbersMatch } from '@/features/numbers/numbers-section';
import { themeMatch } from '@/features/settings/sections/AppearanceSection';
import { templatesMatch } from '@/features/templates/templates-match';
import { t } from '@/lib/i18n/i18n';
import { HUB_PATHS } from './hub-paths';

// The hub search (docs/26b §1, states.html#hub): every setting by label, description or key, and
// the module pages by their own words. Each hit links to the view or tab that holds it.

/** One search result: what matched, where it lives, and the link there. */
export interface HubHit {
  id: string;
  label: string;
  /** «القيم › الأكاديمية» / «التواصل». */
  where: string;
  href: string;
  /** The setting's row key (shown small, LTR), for settings only. */
  settingKey?: SettingKey;
}

type GroupId = keyof typeof t.settingsHub.groups;

const GROUP_OF = new Map<SettingKey, { group: GroupId; owned: boolean }>();
for (const [group, keys] of Object.entries(VALUE_GROUPS)) {
  for (const k of keys) GROUP_OF.set(k, { group: group as GroupId, owned: false });
}
for (const [group, keys] of Object.entries(OWNED_VALUE_GROUPS)) {
  for (const k of keys) GROUP_OF.set(k, { group: group as GroupId, owned: true });
}

const H = t.settingsHub;
const VALUES = t.settingsValues.title;
const COMMS = t.settingsPages.communications;

/** An editable key opens its group with the search; an owned key opens its read-only group. */
function settingHit(key: SettingKey, query: string): HubHit {
  const place = GROUP_OF.get(key);
  const base = { id: `setting:${key}`, label: settingText(key).label, settingKey: key };
  if (!place) return { ...base, where: VALUES, href: HUB_PATHS.values };
  const where = `${VALUES} › ${H.groups[place.group]}`;
  const params = new URLSearchParams({ group: place.group });
  if (!place.owned) params.set('q', query.trim());
  return { ...base, where, href: `${HUB_PATHS.values}?${params.toString()}` };
}

interface ModuleEntry {
  id: string;
  label: string;
  where: string;
  href: string;
  matches: (query: string) => boolean;
}

const linesOrLegacyMatch = (query: string): boolean => linesMatch(query) || groupsMatch(LEGACY_LINE_GROUPS)(query);

const savedRepliesMatch = (query: string): boolean => matchesText(`${t.savedReplies.title} ${t.savedReplies.manageIntro}`, query);

const googleMatch = (query: string): boolean => matchesText(`${H.googleName} ${t.googleSync.title} ${t.googleSync.intro}`, query);

/** The module pages the search reaches, in hub order. */
const MODULES: readonly ModuleEntry[] = [
  { id: 'lines', label: t.templates.settings.lines.title, where: COMMS, href: `${HUB_PATHS.communications}?tab=numbers`, matches: linesOrLegacyMatch },
  { id: 'numbers', label: t.numbers.title, where: COMMS, href: `${HUB_PATHS.communications}?tab=numbers`, matches: numbersMatch },
  { id: 'catalogue', label: t.notificationRules.title, where: COMMS, href: `${HUB_PATHS.communications}?tab=catalogue`, matches: catalogueMatch },
  { id: 'templates', label: t.templates.title, where: COMMS, href: `${HUB_PATHS.communications}?tab=templates`, matches: templatesMatch },
  { id: 'savedReplies', label: t.savedReplies.title, where: COMMS, href: `${HUB_PATHS.communications}?tab=savedReplies`, matches: savedRepliesMatch },
  { id: 'safety', label: t.settingsPages.communicationsTabs.safety, where: COMMS, href: `${HUB_PATHS.communications}?tab=safety`, matches: groupsMatch(SAFETY_GROUPS) },
  { id: 'integrations', label: t.integrations.title, where: t.integrations.title, href: HUB_PATHS.integrations, matches: groupsMatch(INTEGRATIONS_PAGE_GROUPS) },
  { id: 'google', label: t.googleSync.title, where: H.googleName, href: HUB_PATHS.google, matches: googleMatch },
  { id: 'appearance', label: t.settings.theme, where: t.settings.sections.appearance, href: HUB_PATHS.appearance, matches: themeMatch },
];

/** Every hit for the search, settings first (registry order), then module pages; none for an empty search. */
export function searchHub(query: string): HubHit[] {
  if (query.trim() === '') return [];
  const settings = SETTING_KEYS.filter((k) => matchesSetting(k, query)).map((k) => settingHit(k, query));
  const modules = MODULES.filter((m) => m.matches(query)).map((m) => ({ id: `page:${m.id}`, label: m.label, where: m.where, href: m.href }));
  return [...settings, ...modules];
}
