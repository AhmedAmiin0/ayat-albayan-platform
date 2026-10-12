import type { TemplateCategory, TemplateStatus, WaLine } from '../enums/index.js';
import type { TemplateButton } from './templates.js';

// Moved out of views.ts (150-line cap, docs/12 §13.8).

/** GET /messaging/templates item: one message_templates row. */
export interface TemplateView {
  key: string;
  meta_name: string;
  language: string;
  category: TemplateCategory;
  header_format: 'document' | null;
  body_ar: string;
  footer_ar: string | null;
  /** Names of {{1}}, {{2}}, … in order. */
  params: string[];
  buttons: TemplateButton[];
  status: TemplateStatus;
  quality: string | null;
  meta_id: string | null;
  last_checked_at: string | null;
  last_error: string | null;
  submitted_at: string | null;
  /** The line (WABA) Meta approved it on: the sender sends it from there (docs/12 §13.3). */
  line: WaLine;
  /** Offered to sales to start a chat: the only templates a salesperson may list or send (docs/16). */
  sales_starter: boolean;
}

/**
 * GET /messages/gate: can anything go out now (docs/12 §3.1), and if not, which gate is closed —
 * the server's MESSAGING_ENABLED (env_off), WhatsApp not configured, or the admin's switch.
 */
export interface SendGateView {
  open: boolean;
  reason: 'env_off' | 'not_configured' | 'switch_off' | null;
  /** Outbound rows waiting in the queue: they go out the moment the gate opens. */
  queued: number;
  /** Set (true) only when WA_ALLOWED_RECIPIENTS restricts sending; its only reader is the web ServerGateNote. */
  restricted?: boolean;
}
