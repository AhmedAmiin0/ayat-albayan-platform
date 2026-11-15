import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/display/icon';

/** Inline success line (role=status) next to the control that caused it: ✓ + the same verb. */
export function SavedNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-ok">
      <Icon name="check" className="size-[15px]" />
      <span>{children}</span>
    </p>
  );
}
