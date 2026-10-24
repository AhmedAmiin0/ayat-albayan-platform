import type { WaLine } from '../enums/messaging.js';
import type { WaProvider } from '../integrations/keys.js';
import type { TemplateView } from './template-views.js';

// The template registry per number (owner 2026-10-18: «more controls over templates and which number
// it goes to and more options to sync it with meta for each number»). Ids only, never a token.

/** One WhatsApp line as the registry knows it from env: no Graph call. */
export interface TemplateLineFacts {
  line: WaLine;
  configured: boolean;
  /** The line's driver (WA_PROVIDER / WA_CHAT_PROVIDER): Meta directly or Kapso. */
  provider: WaProvider;
  waba_id: string | null;
  phone_number_id: string | null;
}

/** Why a sync did not import a template: a code (templates.perNumber.skipReasons.<code>) and its params. */
export type TemplateSkipReason =
  | { code: 'category'; category: string }
  | { code: 'too_many_vars'; max: number }
  | { code: 'bad_key' | 'media_header' | 'no_body' | 'named_vars' | 'button_value' | 'key_taken' };

/** A Meta template one sync did not import (its name + language), and why. */
export interface TemplateSkip {
  name: string;
  reason: TemplateSkipReason;
}

/** One line's sync with Meta: only its own rows against its own WABA's list. */
export interface TemplateLineSync extends TemplateLineFacts {
  ok: boolean;
  /**
   * The line's failure code when ok is false: not_configured, meta_error, kapso_auth; crm_managed = the line
   * is on the crm driver, whose templates live in the CRM (no call made, no row touched, docs/19).
   */
  error?: string;
  /** Meta's own message for meta_error. */
  message?: string;
  checked_at: string;
  /** Templates on this WABA (as listed); 0 when the read failed. */
  meta_count: number;
  /** Registry rows of this line updated from the list. */
  synced: number;
  /** Keys of the rows this sync imported from the WABA. */
  imported: string[];
  skipped: TemplateSkip[];
}

/** POST /messaging/templates/health: each synced line's result, then the whole registry. */
export interface TemplateHealthView {
  lines: TemplateLineSync[];
  templates: TemplateView[];
}

/** GET /messaging/templates/lines item: the line's facts, the newest check of its rows, its last sync since boot. */
export interface TemplateLineView extends TemplateLineFacts {
  last_checked_at: string | null;
  last_sync: TemplateLineSync | null;
}

/** PATCH /messaging/templates/:key/line: the moved row after its new line's sync (null = that line is not configured). */
export interface TemplateMoveView {
  template: TemplateView;
  sync: TemplateLineSync | null;
}
