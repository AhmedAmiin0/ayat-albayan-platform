import type { TemplateHeader as Header } from '@ab/shared';
import { Icon, t } from '@ab/web-kit';

export function TemplateHeader({ header, hasMedia }: { header: Header | null; hasMedia: boolean }) {
  if (!header) return null;
  if (header.type === 'text') {
    return header.text ? (
      <p dir="auto" className="mb-1 font-bold text-ink [overflow-wrap:anywhere]">
        {header.text}
      </p>
    ) : null;
  }
  if (hasMedia) return null;
  return (
    <p className="mb-1.5 flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-2 text-xs font-semibold text-ink-2">
      <Icon name={header.type === 'document' ? 'template' : 'paperclip'} className="size-4" aria-hidden="true" />
      {t.inbox.templateBubble.header[header.type]}
    </p>
  );
}
