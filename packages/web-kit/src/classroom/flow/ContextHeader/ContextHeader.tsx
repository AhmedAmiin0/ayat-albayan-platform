import type { ContextHeaderProps } from './ContextHeader.types';
import { ContextTitle } from './ContextTitle';

/** The room's top line, on every screen of it: before joining, in the call, and after it. */
export function ContextHeader({ context, children }: ContextHeaderProps) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-rule px-3 py-2 sm:px-4">
      <ContextTitle context={context} />
      {children}
    </header>
  );
}
