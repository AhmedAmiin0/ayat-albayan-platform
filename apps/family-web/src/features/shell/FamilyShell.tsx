import type { ReactNode } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { Bell } from './Bell';
import { TabBar } from './TabBar';

/**
 * Every signed-in family page (docs/51 §1): the wordmark and the bell on top, the page, and the
 * bar (bottom on phones, the side rail from the `shell:` width). Logical utilities only (RTL).
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
          <Bell />
        </header>
        <main className="mx-auto grid w-full max-w-[720px] gap-5 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
