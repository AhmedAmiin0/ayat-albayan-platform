import type { ReactNode } from 'react';
import { Mark } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';

const S = t.familyApp.signIn;

/**
 * The top of a page with no app shell, as the family app (docs/50 §5, #748): the academy emblem
 * (docs/design/brand/logo-mark.png, the kit Mark) on the deep-green tile in both themes, the
 * wordmark «Ayat Al-Bayan» over «آيات البيان», then the page's own line (`children`). The family
 * sign-in and the short-link gate /l/<code> (boards docs/design/short-links/LinkXGate*).
 */
export function BrandLockup({ children }: { children?: ReactNode }) {
  return (
    <header className="grid justify-items-center gap-3 text-center">
      <span className="grid size-[76px] place-items-center rounded-[17px] bg-brand-tile">
        <Mark size={59} />
      </span>
      <div className="grid">
        <h1 lang="en" dir="ltr" className="font-display text-h2 font-bold">
          {S.wordmark}
        </h1>
        <p lang="ar" dir="rtl" className="font-display text-h4 text-ink-2">
          {S.wordmarkArabic}
        </p>
      </div>
      {children}
    </header>
  );
}
