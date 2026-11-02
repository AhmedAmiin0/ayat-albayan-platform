import { CRM_GATED_KEYS, gateApprovedKeys } from '@ab/shared';
import type { Db } from '@/common/db/db.module';
import { templateRows, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { onCrm } from './template-env';

/**
 * The registry rows a send may use (docs/19 «crm driver»): approved ones, and a CRM_GATED_KEYS key
 * on a crm line whose CRM template (teacher_new_student → teacher_lesson_v2) is approved, whatever
 * its own Meta status. The queue gate (TeacherAlertRepo) and the legacy send pass (SenderRepo) read
 * the same rule, so a row queued is a row the sender reads.
 */
export async function sendableTemplates(db: Db): Promise<TemplateRow[]> {
  const gated = `status.eq.approved,key.in.(${CRM_GATED_KEYS.join(',')})`;
  const { data, error } = await db.from('message_templates').select('*').or(gated);
  if (error) throw new Error(`templates read failed: ${error.message}`);
  const rows = templateRows(data);
  const keys = gateApprovedKeys(rows, (r) => onCrm(r.line));
  return rows.filter((r) => keys.has(r.key));
}
