import type { ReactNode } from 'react';
import { FamilyHeader } from './FamilyHeader';
import { TabBar } from './TabBar';

/**
 * Every signed-in family page (docs/51 §1a.2): the deep-green header (the lockup, the pill nav on
 * wide screens, the child and the bell), the page full width on the cream margin (each page brings
 * its own Hero and PageBody), and the bottom bar below the `shell:` width. Logical utilities only.
 */
export function FamilyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-margin">
      <FamilyHeader />
      <main className="grid min-w-0 content-start pb-28 shell:pb-16">{children}</main>
      <TabBar place="bottom" />
    </div>
  );
}
