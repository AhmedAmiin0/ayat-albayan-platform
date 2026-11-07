import { CRM_GATED_KEYS, gateApprovedKeys } from '@ab/shared';
import type { Db } from '@/common/db/db.module';
import { TtlCache } from '@/common/infra/cache/ttl-cache';
import { loadEnv } from '@/config/env/env';
import { templateRows, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { onCrm } from '@/modules/messaging/whatsapp/templates/catalog/template-env';

/** How long the sender's copy of the sendable rows lives (docs/42 42-3). */
const SENDABLE_COPY_MS = 60_000;

/** 0 (no copy) when SETTINGS_CACHE_MS is 0: e2e approves templates by SQL and sends at once. */
export const sendableCopyMs = (): number =>
  loadEnv().SETTINGS_CACHE_MS === 0 ? 0 : SENDABLE_COPY_MS;

/** The rows a send may use before the crm gate: approved ones, and every CRM_GATED_KEYS key. */
async function sendableRows(db: Db): Promise<TemplateRow[]> {
  const gated = `status.eq.approved,key.in.(${CRM_GATED_KEYS.join(',')})`;
  const { data, error } = await db.from('message_templates').select('*').or(gated);
  if (error) throw new Error(`templates read failed: ${error.message}`);
  return templateRows(data);
}

/**
 * The crm gate (docs/19 «crm driver»): a CRM_GATED_KEYS key on a crm line whose CRM template
 * (teacher_new_student → teacher_lesson_v2) is approved, whatever its own Meta status. Read live on
 * every call: a line's driver can change at runtime («التكاملات»), a cached copy never keeps it.
 */
export function gateSendable(rows: TemplateRow[]): TemplateRow[] {
  const keys = gateApprovedKeys(rows, (r) => onCrm(r.line));
  return rows.filter((r) => keys.has(r.key));
}

/**
 * The registry rows a send may use. The queue gate (TeacherAlertRepo) and the legacy send pass
 * (SenderRepo) read the same rule, so a row queued is a row the sender reads.
 */
export async function sendableTemplates(db: Db): Promise<TemplateRow[]> {
  return gateSendable(await sendableRows(db));
}

/** The sender's copy (TemplatesRepo.sendable): the raw rows cached, the gate applied per call. */
export function sendableCache(db: () => Db) {
  const rows = new TtlCache(sendableCopyMs, () => sendableRows(db()));
  return {
    get: (now?: number): Promise<TemplateRow[]> => rows.get(now).then(gateSendable),
    clear: (): void => rows.clear(),
  };
}
