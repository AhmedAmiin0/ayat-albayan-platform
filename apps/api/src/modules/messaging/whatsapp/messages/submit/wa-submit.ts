import type { TemplateDisplayButton } from '@ab/shared';
import { bodyExamples } from '@/modules/messaging/whatsapp/template-review';
import { authSubmitComponents } from '@/modules/messaging/whatsapp/direct/auth-template';
import { templateButtons, templateDisplay } from '@/modules/messaging/whatsapp/messages/wa-json';
import type { GraphBody } from '@/modules/messaging/whatsapp/messages/wa-components';
import { WaError, type TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

/** A fixed text header (display.header: an admin-made template's, or Meta's own after a sync). */
const textHeader = (row: TemplateRow): GraphBody[] => {
  const head = row.header_format === 'document' ? null : templateDisplay(row.display)?.header;
  return head?.type === 'text' && head.text
    ? [{ type: 'HEADER', format: 'TEXT', text: head.text }]
    : [];
};

const urlButton = (b: { text?: string; url: string; example?: string }): GraphBody => {
  const example = b.url.includes('{{1}}')
    ? { example: [b.url.replace('{{1}}', b.example ?? 'sample')] }
    : {};
  return { type: 'URL', text: b.text ?? '', url: b.url, ...example };
};

const SHOWN: Partial<Record<string, (b: TemplateDisplayButton) => GraphBody[]>> = {
  url: (b) => (b.url ? [urlButton({ ...b, url: b.url })] : []),
  quick_reply: (b) => [{ type: 'QUICK_REPLY', text: b.text }],
};

/** The registry's buttons, else what WhatsApp shows (an imported or sales one's plain replies). */
function submitButtons(row: TemplateRow): GraphBody[] {
  const own = templateButtons(row.buttons);
  const shown = templateDisplay(row.display)?.buttons ?? [];
  if (!own.length) return shown.flatMap((b) => SHOWN[b.type]?.(b) ?? []);
  return own.map((b) => (b.type === 'url' ? urlButton(b) : { type: 'QUICK_REPLY', text: b.text }));
}

/**
 * POST /{waba}/message_templates (docs/12 §3.4): a DOCUMENT HEADER with the uploaded sample's
 * handle or a TEXT one, BODY with a sample for every {{n}} (Meta requires them), FOOTER, BUTTONS.
 */
export function submitPayload(row: TemplateRow, headerHandle?: string): GraphBody {
  if (row.category === 'authentication') return authPayload(row);
  const body = bodyComponent(row);
  const components = [
    ...documentHeader(row, headerHandle),
    ...textHeader(row),
    body,
    ...footerOf(row),
    ...buttonsOf(row),
  ];
  const category = row.category.toUpperCase();
  return { name: row.meta_name, language: row.language, category, components };
}

const authPayload = (row: TemplateRow): GraphBody => ({
  name: row.meta_name,
  language: row.language,
  category: 'AUTHENTICATION',
  components: authSubmitComponents(row),
});

/** A DOCUMENT header needs the uploaded sample's handle. */
function documentHeader(row: TemplateRow, headerHandle?: string): GraphBody[] {
  if (row.header_format !== 'document') return [];
  if (!headerHandle) {
    throw new WaError('a document header needs a sample upload handle', { code: null, status: 0 });
  }
  return [{ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [headerHandle] } }];
}

function bodyComponent(row: TemplateRow): GraphBody {
  const examples = bodyExamples(row);
  const example = examples.length ? { example: { body_text: [examples] } } : {};
  return { type: 'BODY', text: row.body_ar, ...example };
}

const footerOf = (row: TemplateRow): GraphBody[] =>
  row.footer_ar ? [{ type: 'FOOTER', text: row.footer_ar }] : [];

function buttonsOf(row: TemplateRow): GraphBody[] {
  const buttons = submitButtons(row);
  return buttons.length ? [{ type: 'BUTTONS', buttons }] : [];
}
