import type { TemplateStatus, WaLine } from '@ab/catalog';
import type { NotificationKey } from './catalogue.js';
import type { NotificationAudience, NotificationChannel, TimingKey } from './catalogue.types.js';
import type { NotificationRuleView } from '../rules.types.js';

// GET /admin/notifications (docs/23 §3 phase 1): the catalogue with each row's effective state,
// computed from today's settings, the send gate and the template registry. Read-only.

/** on = goes out when its trigger happens; off = held by the first blocker; manual = a person sends it. */
export type NotificationState = 'on' | 'off' | 'manual';

/** Why a row would not go out now, in the order they are checked (the first one is shown). */
export const NOTIFICATION_BLOCKERS = [
  'not_configured',
  'messaging_off',
  'auto_off',
  'row_off',
  'template_not_approved',
  // v2 only (tagged clients; the frozen v1 shape maps it to row_off): lesson_join_link while the academy
  // classroom is not in use (LiveKit not configured, or no lesson uses the classroom). PR #134 item 8.
  'classroom_off',
] as const;
export type NotificationBlocker = (typeof NOTIFICATION_BLOCKERS)[number];

export interface NotificationTemplateView {
  key: string;
  /** null: the template has no row in message_templates (never synced). */
  status: TemplateStatus | null;
  line: WaLine | null;
}

export interface NotificationEntryView {
  key: NotificationKey;
  audience: NotificationAudience;
  /** v2 only: the others it reaches too (catalogue alsoTo): a schedule change's teacher. */
  also_to?: NotificationAudience[];
  channels: NotificationChannel[];
  automatic: boolean;
  manual: boolean;
  essential: boolean;
  locked: boolean;
  state: NotificationState;
  blocker: NotificationBlocker | null;
  templates: NotificationTemplateView[];
  /** The WhatsApp numbers it leaves from (its templates' lines); empty for bell / push and free text. */
  lines: WaLine[];
  /** When it is sent: the governing setting and its current value, as text («60», «24، 72»). */
  timing: { key: TimingKey; value: string } | null;
  /**
   * v2 only: how many of its template variants are approved (PR #134 item 7). some = «معتمد جزئيًا»:
   * on, but lessons whose link picks an unapproved variant get nothing. null: no template.
   */
  approval?: 'all' | 'some' | 'none' | null;
  /** v2 only: the admin's choices for this row (docs/23 phase 4). */
  rule?: NotificationRuleView;
}

/** The last good line check, kept so the number shows without asking Meta again (docs/23a §E H2). */
export interface LineHealthView {
  line: WaLine;
  display_phone_e164: string | null;
  verified_name: string | null;
  checked_at: string;
}

export interface NotificationsOverview {
  entries: NotificationEntryView[];
  lines: LineHealthView[];
  /** v2 only: where producers read the rules now (settings.comms_source). */
  mode?: 'legacy' | 'module';
  /** v2 only: whom a family-facing switch reaches («سيصل إلى N ولي أمر»): counts with a phone. */
  reach?: { guardian: number; teacher: number; lead: number };
}
