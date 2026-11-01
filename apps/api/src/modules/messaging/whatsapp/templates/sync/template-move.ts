import type { TemplateLineSync, TemplateMoveView, WaLine } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '@/common/audit/audit.service';
import { requireSync } from '@/modules/messaging/whatsapp/templates/catalog/template-env';
import { syncLine, type LineSyncDeps } from './template-line-sync';
import { REGISTRY_ENTITY_ID, toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';

// «نقل إلى الرقم الآخر» (owner 2026-10-18: «which number it goes to»): the admin moves a template to
// the other line (WABA). Its Meta state belonged to the old WABA, so it starts over as not_submitted
// and the new line is synced at once: approved if the template is there, else the admin submits it.

interface MoveDeps extends LineSyncDeps {
  queries: Pick<TemplatesRepo, 'all' | 'get' | 'update' | 'insert'>;
  audit: Pick<AuditService, 'record'>;
  /** The registry keeps each line's last sync (GET /messaging/templates/lines). */
  remember: (sync: TemplateLineSync) => Promise<void>;
}

const FRESH = { status: 'not_submitted', meta_id: null, quality: null, last_error: null, submitted_at: null, last_checked_at: null } as const;

/** PATCH /messaging/templates/:key/line (audited, template_line_set); the same line is a no-op. */
export async function moveTemplate(deps: MoveDeps, input: { key: string; line: WaLine }, actorId: string): Promise<TemplateMoveView> {
  requireSync();
  const { key, line } = input;
  const row = await deps.queries.get(key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  if (row.line === line) return { template: toTemplateView(row), sync: null };
  const moved = await deps.queries.update(key, { line, ...FRESH });
  await deps.audit.record({
    actorId,
    entity: 'message_templates',
    entityId: REGISTRY_ENTITY_ID,
    action: 'template_line_set',
    before: { key, line: row.line, status: row.status, meta_id: row.meta_id },
    after: { key, line, status: FRESH.status },
  });
  const sync = deps.lines[line].configured() ? await syncLine(deps, line, new Date()) : null;
  if (sync) await deps.remember(sync);
  const after = (await deps.queries.get(key)) ?? moved ?? { ...row, line, ...FRESH };
  return { template: toTemplateView(after), sync };
}
