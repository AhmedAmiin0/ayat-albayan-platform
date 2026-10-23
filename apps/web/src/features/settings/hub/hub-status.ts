import {
  counted,
  EDITABLE_VALUE_KEYS,
  PUBLIC_SETTING_KEYS,
  SETTING_DEFAULTS,
  type AcademySettings,
  type Glyph,
  type GoogleStatusView,
  type IntegrationConfigItem,
  type IntegrationGroup,
  type Tone,
} from '@ab/shared';
import { accountStyle, fill } from '@/features/google-sync/google-format';
import { t } from '@/lib/i18n';

// The hub's «الحالة الآن» cells (docs/26b §1), as plain data: each cell draws one of these.

const H = t.settingsHub;

/** One status chip: nuqta shape + word (+ tone). */
export interface HubChip {
  tone: Tone;
  glyph: Glyph;
  label: string;
}

/** Same value? Objects compared key by key (the API may order an object's keys differently). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  return [...keys].every((k) => sameValue(ra[k], rb[k]));
}

const PUBLIC: ReadonlySet<string> = new Set(PUBLIC_SETTING_KEYS);

/** «28 قيمة · 5 معدَّلة · 8 عامة»: the editable values of «القيم», the changed ones, the public ones. */
export function valuesSummary(settings: AcademySettings): string {
  const modified = EDITABLE_VALUE_KEYS.filter((k) => !sameValue(settings[k], SETTING_DEFAULTS[k])).length;
  const open = EDITABLE_VALUE_KEYS.filter((k) => PUBLIC.has(k)).length;
  return [
    counted(H.valuesCount, EDITABLE_VALUE_KEYS.length),
    fill(H.valuesModified, { n: modified }),
    fill(H.valuesPublic, { n: open }),
  ].join(' · ');
}

/** The services «التكاملات» sets up (docs/26b §1): online lessons, mobile and browser push, exchange rates. */
export const HUB_SERVICES = ['livekit', 'expo', 'web_push', 'fx'] as const satisfies readonly IntegrationGroup[];

/** Set up = every secret of the service is set (a service without a secret: every key). */
function serviceSet(items: readonly IntegrationConfigItem[], group: IntegrationGroup): boolean {
  const own = items.filter((i) => i.group === group);
  const secrets = own.filter((i) => i.secret);
  const needed = secrets.length > 0 ? secrets : own;
  return needed.length > 0 && needed.every((i) => i.set);
}

/** «3 خدمات مضبوطة» + «أسعار الصرف غير مضبوطة» (one missing, by name) or «2 خدمتان غير مضبوطتين». */
export function integrationChips(items: readonly IntegrationConfigItem[]): HubChip[] {
  const missing = HUB_SERVICES.filter((g) => !serviceSet(items, g));
  const ok = HUB_SERVICES.length - missing.length;
  const chips: HubChip[] = [];
  if (ok > 0) chips.push({ tone: 'ok', glyph: 'fill', label: counted(H.servicesOk, ok) });
  const [only] = missing;
  if (missing.length === 1 && only) {
    chips.push({ tone: 'neutral', glyph: 'hollow', label: fill(H.serviceUnset, { name: t.integrations.groups[only] }) });
  } else if (missing.length > 1) {
    chips.push({ tone: 'neutral', glyph: 'hollow', label: counted(H.servicesUnset, missing.length) });
  }
  return chips;
}

/** «متصل» + «تجربة بدون كتابة» / «كتابة فعلية» / «المزامنة متوقفة»; the client not set up says only that. */
export function googleChips(status: GoogleStatusView): HubChip[] {
  if (!status.configured) return [{ tone: 'neutral', glyph: 'hollow', label: H.googleNotConfigured }];
  const account = status.connection.status;
  const chips: HubChip[] = [{ ...accountStyle[account], label: t.googleSync.connection.status[account] }];
  const sw = t.googleSync.switches;
  if (!status.settings.enabled) chips.push({ tone: 'neutral', glyph: 'struck', label: H.googleOff });
  else if (status.settings.mode === 'live') chips.push({ tone: 'ok', glyph: 'fill', label: sw.live });
  else chips.push({ tone: 'neutral', glyph: 'half', label: sw.dryRun });
  return chips;
}
