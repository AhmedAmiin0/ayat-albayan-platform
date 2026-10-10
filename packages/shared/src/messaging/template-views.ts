import type { TemplateCategory, TemplateStatus } from '../enums/index.js';
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
