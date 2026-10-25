import type { TemplateStatus, TemplateView } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../common/audit/audit.service';
import { lineProvider, loadEnv } from '../../config/env/env';
import { fromMeta, onCrm, requireLine, requireSync } from './template-env';
import { SAMPLE_REPORT, templateProblem } from './template-review';
import { ourStatus } from './template-sync';
import { CRM_MANAGED, REGISTRY_ENTITY_ID, toTemplateView, waHttpError } from './template.mapper';
import type { TemplatesQueries } from './templates.queries';
import type { WhatsappLines } from './whatsapp.types';

// Submitting a template (T3, docs/12 §3.4), out of template.registry.ts (150-line cap). It goes to the
// template's OWN line's WABA (owner 2026-10-18), chat rows included, under that line's driver.

const SUBMITTABLE: ReadonlySet<TemplateStatus> = new Set(['not_submitted', 'rejected', 'missing']);

export interface SubmitDeps {
  queries: Pick<TemplatesQueries, 'get' | 'update'>;
  lines: WhatsappLines;
  audit: Pick<AuditService, 'record'>;
}

/**
 * POST /messaging/templates/:key/submit. A body Meta would reject is 409 invalid_template before any
 * call; the row's line must be configured (503 not_configured). A document header (report_ready) first
 * uploads the sample PDF for Meta's reviewer: that needs the line's app id (409 needs_app_id without it;
 * 409 needs_meta_driver on a kapso line), both naming the row's line. A rejected row is edited in place
 * by the driver (Kapso: hsm_id). A row whose line is on crm: 409 crm_managed before anything else.
 */
export async function submitTemplate(deps: SubmitDeps, key: string, actorId: string): Promise<TemplateView> {
  requireSync();
  const row = await deps.queries.get(key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  // A crm line's templates are submitted and approved in the CRM (from Meta), never from here.
  if (onCrm(row.line)) throw waHttpError(CRM_MANAGED, 409, { line: row.line });
  if (!SUBMITTABLE.has(row.status)) throw waHttpError('not_submittable', 409, { status: row.status });
  const problem = templateProblem(row);
  if (problem) throw waHttpError('invalid_template', 409, { reason: problem });
  const client = deps.lines[row.line];
  requireLine(client, row.line);
  const document = row.header_format === 'document';
  // Kapso has no sample upload (docs/19): WA_APP_ID cannot help there, only switching the line to meta.
  const noSamples = lineProvider(loadEnv(), row.line) === 'kapso' ? 'needs_meta_driver' : 'needs_app_id';
  if (document && !client.canUploadSamples()) throw waHttpError(noSamples, 409, { line: row.line });
  const headerHandle = document ? await fromMeta(() => client.uploadSample(SAMPLE_REPORT)) : undefined;
  const res = await fromMeta(() => client.submitTemplate(row, { headerHandle }));
  const status = ourStatus(res.status);
  const meta_id = res.metaId || row.meta_id;
  const updated = await deps.queries.update(key, { status, meta_id, submitted_at: new Date().toISOString(), last_error: null });
  await deps.audit.record({
    actorId,
    entity: 'message_templates',
    entityId: REGISTRY_ENTITY_ID,
    action: 'template_submitted',
    before: { key, status: row.status, meta_id: row.meta_id },
    after: { key, status, meta_id, line: row.line },
  });
  return toTemplateView(updated ?? row);
}
