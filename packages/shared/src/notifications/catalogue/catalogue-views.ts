import type { TemplateStatus, WaLine } from '@ab/catalog';
import type { NotificationKey } from './catalogue';
import type { NotificationAudience, NotificationChannel, TimingKey } from './catalogue.types';
import type { NotificationRuleView } from '../rules.types';

// GET /admin/notifications (docs/23 §3 phase 1): the catalogue with each row's effective state,
// computed from today's settings, the send gate and the template registry. Read-only.

/** on = goes out when its trigger happens; off = held by the first blocker; manual = a person sends it. */
export type NotificationState = 'on' | 'off' | 'manual';

/** The catalogue's tabs: one audience, or manual (every manual row). */
export type AudienceTab = NotificationAudience | 'manual';

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
  /** When it is sent: the governing setting and its current value, as text. */
  timing: { key: TimingKey; value: string } | null;
  /** v2 only: approved variants; some means lessons picking an unapproved variant get nothing. */
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
  /** v2 only: whom a family-facing switch reaches, counting contacts with a phone. */
  reach?: { guardian: number; teacher: number; lead: number };
}
