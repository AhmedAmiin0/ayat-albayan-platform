import { z } from 'zod';

// The CRM's own text of a template (GET templates, docs/39): the same fields its TemplatePayload
// posts (header_type / header_content, body_text, footer_text, buttons), as Meta components, so
// the inbox can show a row sent through the CRM exactly as the recipient got it. Every field is
// optional: an older CRM lists none, and a malformed one reads as absent.

const buttonSchema = z.object({
  type: z.string(),
  text: z.string().nullish(),
  url: z.string().nullish(),
  phone_number: z.string().nullish(),
});

export const crmTextSchema = z.object({
  header_type: z.string().nullish().catch(null),
  header_content: z.string().nullish().catch(null),
  body_text: z.string().nullish().catch(null),
  footer_text: z.string().nullish().catch(null),
  buttons: z.array(buttonSchema).nullish().catch(null),
});
type CrmText = z.infer<typeof crmTextSchema>;

type Button = z.infer<typeof buttonSchema>;
const metaButton = (b: Button) => ({
  type: b.type.toUpperCase(),
  ...(b.text ? { text: b.text } : {}),
  ...(b.url ? { url: b.url } : {}),
  ...(b.phone_number ? { phone_number: b.phone_number } : {}),
});

function header(t: CrmText): object[] {
  const format = (t.header_type ?? '').toUpperCase();
  if (!format || format === 'NONE') return [];
  const text = format === 'TEXT' ? t.header_content : null;
  return [{ type: 'HEADER', format, ...(text ? { text } : {}) }];
}

const part = (type: string, text: string | null | undefined): object[] =>
  (text ? [{ type, text }] : []);

/** HEADER, BODY, FOOTER, BUTTONS as Meta lists them; [] when the CRM sent no body. */
export function crmComponents(t: CrmText): object[] {
  if (!t.body_text) return [];
  const buttons = t.buttons?.length ? [{ type: 'BUTTONS', buttons: t.buttons.map(metaButton) }] : [];
  return [...header(t), ...part('BODY', t.body_text), ...part('FOOTER', t.footer_text), ...buttons];
}
