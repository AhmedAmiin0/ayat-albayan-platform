import type { TemplateStatus, WaLine } from '../../enums/index.js';
import { NOTIFICATION_CATALOGUE, type NotificationKey } from './catalogue.js';
import type { CatalogueSettings } from './catalogue-settings.js';
import type { NotificationEntry } from './catalogue.types.js';
import type { NotificationBlocker, NotificationEntryView, NotificationTemplateView } from './catalogue-views.js';
import { approvalOf, timingOf } from './catalogue-timing.js';
import type { EffectiveRule } from '../rules.types.js';

/** What decides a row's state today: the settings, the send gate and the template registry. */
export interface CatalogueInputs {
  /** Only the catalogue's slice is read (a full AcademySettings fits). */
  settings: CatalogueSettings;
  /** GET /messages/gate's reason: not_configured = no notifications line on the server. */
  gateReason: 'not_configured' | 'switch_off' | null;
  templates: ReadonlyMap<string, { status: TemplateStatus; line: WaLine }>;
  /**
   * Each row's effective rule (NotificationPolicy, docs/23b): when given, a row's own switch and its
   * timing come from here (a missing key falls back to the legacy switch). Left out: today's settings.
   */
  rules?: ReadonlyMap<string, EffectiveRule>;
  /** false: the academy classroom is not in use (LiveKit not configured): lesson_join_link is held. Default true. */
  classroom?: boolean;
}

/** The row's own switch: the effective rule when known, else today's legacy switch. */
function rowOn(entry: NotificationEntry, inputs: CatalogueInputs): boolean {
  const rule = inputs.rules?.get(entry.key);
  if (rule) return rule.enabled;
  return !entry.rowSwitch || entry.rowSwitch.isOn(inputs.settings);
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
  if (!rowOn(entry, inputs)) return 'row_off';
  return rowBlocker(entry, inputs, templates);
}

/** After the row's own switch: the classroom (lesson_join_link only, PR #134 item 8), then the template. */
function rowBlocker(entry: NotificationEntry, inputs: CatalogueInputs, templates: NotificationTemplateView[]): NotificationBlocker | null {
  if (entry.key === 'lesson_join_link' && inputs.classroom === false) return 'classroom_off';
  if (templates.length > 0 && !templates.some((t) => t.status === 'approved')) return 'template_not_approved';
  return null;
}

/** One catalogue row as the admin sees it now (the first blocker, in words on the client). */
export function entryView(entry: NotificationEntry<NotificationKey>, inputs: CatalogueInputs): NotificationEntryView {
  const templates = entry.templates.map((key) => {
    const row = inputs.templates.get(key);
    return { key, status: row?.status ?? null, line: row?.line ?? null };
  });
  const whatsapp = entry.channels.includes('whatsapp');
  // Bell / push rows: only their own rule holds them (locked rows always resolve on).
  const blocker = whatsapp ? whatsappBlocker(entry, inputs, templates) : rowOn(entry, inputs) ? null : 'row_off';
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
    timing: timingOf(entry, inputs.settings, inputs.rules),
    approval: approvalOf(templates),
  };
}

/** Every row, in catalogue order. */
export function catalogueViews(inputs: CatalogueInputs): NotificationEntryView[] {
  return NOTIFICATION_CATALOGUE.map((e) => entryView(e, inputs));
}
