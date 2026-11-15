import type { MessageTemplateBlock } from '@ab/shared';
import { TemplateButtons, TemplateFrame } from '@/features/messaging/inbox';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  body: string;
  block: MessageTemplateBlock;
}

/** The bubble as WhatsApp draws it, live while the form is typed (the composer's own look). */
export function TemplatePreview({ body, block }: TemplatePreviewProps) {
  return (
    <figure className="grid gap-1.5">
      <figcaption className="text-xs font-semibold text-ink-3">{t.templates.author.preview}</figcaption>
      <div
        className={cn(
          'max-w-[min(100%,560px)] min-w-[min(100%,260px)] justify-self-start overflow-hidden',
          'rounded-lg bg-sunk px-3.5 pt-2.5 text-sm',
          block.buttons.length === 0 && 'pb-2.5',
        )}
      >
        <TemplateFrame block={block} hasMedia={false}>
          <p dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {body || '—'}
          </p>
        </TemplateFrame>
        <TemplateButtons buttons={block.buttons} />
      </div>
    </figure>
  );
}
