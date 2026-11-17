import type { ReactNode } from 'react';
import { MeTestChip } from '@ab/web-kit/auth/MeTestChip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Bell } from './Bell';
import { ChildSwitch } from './ChildSwitch';
import { TabBar } from './TabBar';

/**
 * Every signed-in family page (docs/51 §1): the wordmark, «تجريبي» on a test family (docs/56),
 * the child a guardian of several works as and the bell on top, the page, and the bar (bottom on
 * phones, the side rail from the `shell:` width). Logical utilities only (RTL).
 */
export function FamilyShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-page shell:grid shell:grid-cols-[14rem_minmax(0,1fr)]">
      <TabBar />
      <div className="grid min-w-0 content-start pb-24 shell:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b
          border-rule bg-page/95 px-4 py-2 backdrop-blur">
          <p lang="en" dir="ltr" className="font-display text-lg font-bold text-ink">
            {t.familyApp.signIn.wordmark}
          </p>
          <div className="flex min-w-0 items-center gap-1">
            <MeTestChip />
            <ChildSwitch />
            <Bell />
          </div>
        </header>
        <main className="mx-auto grid w-full max-w-[720px] gap-5 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
