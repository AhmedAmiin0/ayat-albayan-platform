import type { MessageTemplateBlock, TemplateHeader } from '@ab/shared';
import type { EditButton } from '@/features/messaging/templates/edit/edit-draft';

/** The bubble's frame while typing: the template's own header, the footer and buttons as typed. */
export function previewBlock(
  header: TemplateHeader | null,
  draft: { footer: string; buttons: readonly EditButton[] },
): MessageTemplateBlock {
  const buttons = draft.buttons.map((b) =>
    b.type === 'url' ? { type: b.type, text: b.text, url: b.url } : { type: b.type, text: b.text });
  return { header, footer: draft.footer.trim() || null, buttons };
}
