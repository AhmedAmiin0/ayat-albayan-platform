import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { ContextTitleProps } from './ContextTitle.types';

/** The lesson title over its time, or the room's own name. */
export function ContextTitle({ context }: ContextTitleProps) {
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-body font-bold">{context?.title ?? t.classroom.title}</h1>
      {context?.subtitle && <p className="text-xs text-ink-2 tabular-nums">{context.subtitle}</p>}
    </div>
  );
}
