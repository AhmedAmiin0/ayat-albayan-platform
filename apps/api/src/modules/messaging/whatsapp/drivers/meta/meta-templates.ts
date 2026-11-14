import type { Http } from '@/common/infra/http/http.types';
import type { GraphEnv } from '@/config/env/env';
import { nextTemplateCursor, templateEditPath } from '@/modules/messaging/whatsapp/drivers/kapso/kapso';
import { submitPayload } from '@/modules/messaging/whatsapp/messages/wa-components';
import type { MetaTemplate, TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { submitSchema, templatesPageSchema, toMetaTemplate } from './meta-shapes';

// GET /{waba}/message_templates, every page (out of whatsapp.client.ts, 150-line cap).

/** ponytail: 20 × 100 templates; the academy has 12. */
const MAX_TEMPLATE_PAGES = 20;
const TEMPLATE_PAGE = 100;
const TEMPLATE_FIELDS = 'id,name,language,status,category,quality_score,components,rejected_reason';

/** Every page, following the cursor while the driver says there is a next page (kapso.ts). */
export async function listTemplates(env: GraphEnv, http: Http): Promise<MetaTemplate[]> {
  const all: MetaTemplate[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_TEMPLATE_PAGES; page += 1) {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
    const query = `limit=${TEMPLATE_PAGE}&fields=${TEMPLATE_FIELDS}${cursor}`;
    const path = `${env.wabaId}/message_templates?${query}`;
    const body = await http.json({ path, schema: templatesPageSchema });
    all.push(...body.data.map(toMetaTemplate));
    const page = { count: body.data.length, limit: TEMPLATE_PAGE, paging: body.paging };
    after = nextTemplateCursor(env, page);
    if (!after) break;
  }
  return all;
}

/**
 * Meta's edit of a template it knows (POST /{id}; Kapso: ?hsm_id=, kapso.ts): the components only,
 * the name and the category never change. Back to PENDING.
 */
export async function editMetaTemplate(
  c: { env: GraphEnv; http: Http },
  row: TemplateRow,
  headerHandle?: string,
): Promise<{ status: string }> {
  const json = { components: submitPayload(row, headerHandle).components };
  const path = templateEditPath(c.env, row.meta_id ?? '');
  const res = await c.http.json({ path, method: 'POST', json, schema: submitSchema });
  return { status: res.status ?? 'PENDING' };
}
