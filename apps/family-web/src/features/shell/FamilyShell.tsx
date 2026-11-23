import type { ReactNode } from 'react';
import { MeTestChip } from '@ab/web-kit/auth';
import { Mark } from '@ab/web-kit/ui';
import { t } from '@ab/web-kit/i18n';
import { cn } from '@ab/web-kit/lib';
import { Bell } from './Bell';
import { ChildSwitch } from './ChildSwitch';
import { TabBar } from './TabBar';

/** The emblem on the deep-green tile (brandTile, both themes) and the family app's name. */
function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p className={className}>
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-tile">
        <Mark size={28} />
      </span>
      <span
        lang="en"
        dir="ltr"
        className={cn(
          'whitespace-nowrap font-display text-body font-bold text-ink',
          compact && 'max-sm:sr-only',
        )}
      >
        {t.familyApp.signIn.wordmark}
      </span>
    </p>
  );
}

/**
 * Every signed-in family page (docs/51 §1) in the staff shell's idiom (owner 2026-11-19): from
 * `shell:` the mint rail (brand, then the fihris) beside the work column; below it a top row
 * (brand, the child a guardian of several works as, «تجريبي», the bell) and the bottom bar. The
 * ground is the margin tone; the pages lay raised cards on it. Logical utilities only.
 */
export function FamilyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh shell:grid shell:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-raised/95 px-2
        pb-[env(safe-area-inset-bottom)] backdrop-blur shell:sticky shell:top-0 shell:flex
        shell:h-dvh shell:flex-col shell:gap-6 shell:border-t-0 shell:border-e shell:bg-cover
        shell:px-3 shell:pt-6 shell:pb-6 shell:backdrop-blur-none">
        <Brand className="hidden items-center gap-2.5 px-3 shell:flex" />
        <TabBar />
      </aside>
      <div className="grid min-w-0 content-start pb-24 shell:pb-0">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3
          border-b border-rule bg-margin/95 px-4 backdrop-blur shell:border-b-0 shell:px-8">
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
