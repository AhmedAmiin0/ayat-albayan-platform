import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { RoomContext } from './room-kit';

/** The lesson title over its time, or the room's own name. */
export function ContextTitle({ context }: { context: RoomContext | null }) {
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-body font-bold">{context?.title ?? t.classroom.title}</h1>
      {context?.subtitle && <p className="text-xs text-ink-2 tabular-nums">{context.subtitle}</p>}
    </div>
  );
}

interface Props {
  context: RoomContext | null;
  children?: ReactNode;
}

/** The room's top line, on every screen of it: before joining, in the call, and after it. */
export function ContextHeader({ context, children }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule px-3 py-2 sm:px-4">
      <ContextTitle context={context} />
      {children}
    </header>
  );
}
