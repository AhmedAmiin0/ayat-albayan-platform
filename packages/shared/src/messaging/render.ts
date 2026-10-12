import { BODY_SLOTS, type BodySlot, type TemplateButton, type TemplateParams } from './templates.js';

// Template text as the guardian reads it: the inbox shows outbound template rows with it, and the
// R-MSG-03 wa.me fallback pre-fills it.

/** The message_templates columns rendering needs. */
export interface RenderableTemplate {
  body_ar: string;
  footer_ar: string | null;
  buttons: readonly TemplateButton[];
}

const isSlot = (n: string): n is BodySlot => (BODY_SLOTS as readonly string[]).includes(n);

/** {{n}} → params[n]; a missing value keeps its {{n}} so the gap is visible, never blank. */
export function renderTemplateBody(body: string, params: TemplateParams): string {
  return body.replace(/\{\{(\d+)\}\}/g, (whole, n: string) => {
    const value = isSlot(n) ? params[n] : undefined;
    return value ?? whole;
  });
}

export interface FallbackInput {
  template: RenderableTemplate;
  params: TemplateParams;
  /** Signed URL of the template's document (report_ready): wa.me can't attach a file. */
  documentUrl?: string | null;
}

/**
 * The text an admin sends by hand (R-MSG-03): the rendered body, the meeting link the URL button
 * would open, the document link, then the footer, separated by blank lines.
 */
export function fallbackText(input: FallbackInput): string {
  const { template, params } = input;
  const parts = [renderTemplateBody(template.body_ar, params)];
  for (const b of template.buttons) {
    if (b.type === 'url' && params.button) parts.push(b.url.replace('{{1}}', params.button));
  }
  if (input.documentUrl) parts.push(input.documentUrl);
  if (template.footer_ar) parts.push(template.footer_ar);
  return parts.join('\n\n');
}
