import { isWaLine, type WaLine } from '@ab/shared';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineProvider, loadEnv, type Env } from '@/config/env/env';
import { wabaReport } from '@/modules/messaging/whatsapp/drivers/waba/waba-report';
import { wabaTemplate, type WabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import type { MessageRow } from '@/modules/messaging/whatsapp/messages/message.mapper';
import { templateParams } from '@/modules/messaging/whatsapp/messages/wa-json';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// Which WABA template a row went as, and with which values: the drivers' own resolution
// (waba-template.ts, waba-report.ts), so what the inbox shows can never drift from what was sent.

/** A placeholder for the report's file link: the display needs the template, never the file. */
const DISPLAY_ONLY = 'display-only';

type RowOf = Pick<MessageRow, 'number_id' | 'line'>;

const lineOf = (row: RowOf): WaLine => (row.line && isWaLine(row.line) ? row.line : 'notifications');

/**
 * The row went through the CRM driver (docs/19): its number's driver (module mode, the number
 * stamped at claim), else its line's (legacy, or a row not claimed yet).
 */
export function sentOnCrm(row: RowOf, env: Env = loadEnv()): boolean {
  const own = numberEnv(row.number_id);
  const provider = own ? (own.provider ?? 'meta') : lineProvider(env, lineOf(row));
  return provider === 'crm';
}

/** The row's number's driver config, module mode only (null: legacy, unknown or cannot send). */
const numberEnv = (id: string | null) =>
  (id ? (overlayNumbers()?.find((n) => n.id === id)?.env ?? null) : null);

interface SentInput {
  row: Pick<MessageRow, 'phone_e164' | 'template_params'>;
  template: TemplateRow;
}

/**
 * The template and values the driver sends for this row: the old report flow's report_session /
 * report_trial_session, else wabaTemplate (crm_name, params.crm). null = the row's values do not
 * build a send (a driver would refuse it): the inbox keeps the registry's text.
 */
export function sentTemplate(input: SentInput): WabaTemplate | null {
  const send = {
    to: input.row.phone_e164,
    template: input.template,
    params: templateParams(input.row.template_params),
    documentUrl: DISPLAY_ONLY,
  };
  try {
    return wabaReport(send)?.template ?? wabaTemplate(send);
  } catch {
    return null;
  }
}
