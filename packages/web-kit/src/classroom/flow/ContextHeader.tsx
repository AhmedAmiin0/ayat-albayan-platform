import type { ReactNode } from 'react';
import { t } from '#/lib/i18n/index.ts';
import type { RoomContext } from './room-kit';

/** «حلقة يوسف مع أ. فاطمة» over its time («6:30 – 7:15 م»), or the room's own name. */
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
  /** The end side of the line (the room: «جارٍ التسجيل» and the people pill). */
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
