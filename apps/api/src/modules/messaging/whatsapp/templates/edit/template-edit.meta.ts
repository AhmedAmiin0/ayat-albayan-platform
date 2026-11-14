import type { HttpException } from '@nestjs/common';
import { lineProvider, loadEnv } from '@/config/env/env';
import { SAMPLE_REPORT } from '@/modules/messaging/whatsapp/template-review';
import {
  fromMeta, onCrm, requireLine, requireSync,
} from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { CRM_MANAGED, waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplateRow, WhatsappClient, WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';

// Meta's edit of a template it knows, through the row's own line's driver (Meta: POST /{template
// id}; Kapso: /{waba}/message_templates?hsm_id=…, kapso.ts templateEditPath). The same checks as
// the submit (template-submit.ts): the sync switch, a configured line, never a crm line.

/** Kapso has no sample upload (docs/19): a PDF header is edited only under the meta driver. */
const noSamples = (row: TemplateRow): HttpException => {
  const code = lineProvider(loadEnv(), row.line) === 'kapso' ? 'needs_meta_driver' : 'needs_app_id';
  return waHttpError(code, 409, { line: row.line });
};

/** A document header (report_ready) needs Meta's sample again; any other none. */
async function headerHandle(client: WhatsappClient, row: TemplateRow): Promise<string | undefined> {
  if (row.header_format !== 'document') return undefined;
  if (!client.canUploadSamples()) throw noSamples(row);
  return fromMeta(() => client.uploadSample(SAMPLE_REPORT));
}

/** 409 crm_managed / template_sync_off, 503 not_configured, 502 meta_error. */
export async function editOnMeta(lines: WhatsappLines, row: TemplateRow): Promise<void> {
  requireSync();
  if (onCrm(row.line)) throw waHttpError(CRM_MANAGED, 409, { line: row.line });
  const client = lines[row.line];
  requireLine(client, row.line);
  const handle = await headerHandle(client, row);
  await fromMeta(async () => {
    if (!client.editTemplate) throw waHttpError(CRM_MANAGED, 409, { line: row.line });
    return client.editTemplate(row, { headerHandle: handle });
  });
}
