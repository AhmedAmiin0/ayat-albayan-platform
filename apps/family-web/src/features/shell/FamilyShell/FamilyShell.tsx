import { MeTestChip } from '@ab/web-kit';
import { Bell } from '@/features/shell/Bell';
import { ChildSwitch } from '@/features/shell/ChildSwitch';
import { TabBar } from '@/features/shell/TabBar';
import type { FamilyShellProps } from './FamilyShell.types';
import { Brand } from './Brand';

/** docs/51 §1: logical utilities only. */
export function FamilyShell({ children }: FamilyShellProps) {
  return (
    <div className="min-h-dvh shell:grid shell:grid-cols-[15rem_minmax(0,1fr)]">
      <aside
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-raised/95 px-2
        pb-[env(safe-area-inset-bottom)] backdrop-blur shell:sticky shell:top-0 shell:flex
        shell:h-dvh shell:flex-col shell:gap-6 shell:border-t-0 shell:border-e shell:bg-cover
        shell:px-3 shell:pt-6 shell:pb-6 shell:backdrop-blur-none"
      >
        <Brand className="hidden items-center gap-2.5 px-3 shell:flex" />
        <TabBar />
      </aside>
      <div className="grid min-w-0 content-start pb-24 shell:pb-0">
        <header
          className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3
          border-b border-rule bg-margin/95 px-4 backdrop-blur shell:border-b-0 shell:px-8"
        >
          <Brand compact className="flex items-center gap-2 shell:invisible" />
          <div className="flex min-w-0 items-center gap-1">
            <MeTestChip />
            <ChildSwitch />
            <Bell />
          </div>
        </header>
        <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 pt-4 pb-8 shell:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
