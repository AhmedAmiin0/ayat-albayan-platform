import type { ReactNode } from 'react';
import { Mark } from '@ab/web-kit/components/ui/display/mark';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const S = t.familyApp.signIn;

/** Header for pages without a shell (docs/50 §5, #748); same emblem in both themes. */
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
