import type { TemplateStatus, WaLine } from '../enums/index.js';
import { NOTIFICATION_CATALOGUE, type NotificationKey } from './catalogue.js';
import type { CatalogueSettings } from './catalogue-settings.js';
import type { NotificationEntry } from './catalogue.types.js';
import type { NotificationBlocker, NotificationEntryView, NotificationTemplateView } from './catalogue-views.js';

/** What decides a row's state today: the settings, the send gate and the template registry. */
export interface CatalogueInputs {
  /** Only the catalogue's slice is read (a full AcademySettings fits). */
  settings: CatalogueSettings;
  /** GET /messages/gate's reason: not_configured = no notifications line on the server. */
  gateReason: 'not_configured' | 'switch_off' | null;
  templates: ReadonlyMap<string, { status: TemplateStatus; line: WaLine }>;
}

/**
 * The first reason a WhatsApp row would not go out, or null. Fail-closed: only a stored `true`
 * opens the switches (settings defaults are false).
 */
function whatsappBlocker(entry: NotificationEntry, inputs: CatalogueInputs, templates: NotificationTemplateView[]): NotificationBlocker | null {
  const { settings } = inputs;
  if (inputs.gateReason === 'not_configured') return 'not_configured';
  if (settings.messaging_enabled !== true || inputs.gateReason === 'switch_off') return 'messaging_off';
  if (entry.manual) return null;
  if (entry.automatic && settings.auto_messages_enabled !== true) return 'auto_off';
  if (entry.rowSwitch && !entry.rowSwitch.isOn(settings)) return 'row_off';
  if (templates.length > 0 && !templates.some((t) => t.status === 'approved')) return 'template_not_approved';
  return null;
}

function timingOf(entry: NotificationEntry, settings: CatalogueSettings): NotificationEntryView['timing'] {
  if (!entry.timing) return null;
  const value = settings[entry.timing];
  return { key: entry.timing, value: Array.isArray(value) ? value.join('، ') : String(value) };
}

/** One catalogue row as the admin sees it now (the first blocker, in words on the client). */
export function entryView(entry: NotificationEntry<NotificationKey>, inputs: CatalogueInputs): NotificationEntryView {
  const templates = entry.templates.map((key) => {
    const row = inputs.templates.get(key);
    return { key, status: row?.status ?? null, line: row?.line ?? null };
  });
  const whatsapp = entry.channels.includes('whatsapp');
  const blocker = whatsapp ? whatsappBlocker(entry, inputs, templates) : null;
  const known = [...new Set(templates.flatMap((t) => (t.line ? [t.line] : [])))];
  // A template not synced yet would leave from the registry's default number (notifications).
  const lines: WaLine[] = known.length === 0 && templates.length > 0 ? ['notifications'] : known;
  return {
    key: entry.key,
    audience: entry.audience,
    channels: [...entry.channels],
    automatic: entry.automatic,
    manual: entry.manual,
    essential: entry.essential,
    locked: entry.locked,
    state: entry.manual ? 'manual' : blocker ? 'off' : 'on',
    blocker,
    templates,
    lines,
    timing: timingOf(entry, inputs.settings),
  };
}

/** Every row, in catalogue order. */
export function catalogueViews(inputs: CatalogueInputs): NotificationEntryView[] {
  return NOTIFICATION_CATALOGUE.map((e) => entryView(e, inputs));
}
