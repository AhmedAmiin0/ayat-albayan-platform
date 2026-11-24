import { Mark } from '@ab/web-kit/components/ui/display/mark';
import type { LegalDocumentProps } from './LegalDocument.types';

/**
 * A public legal page (privacy policy, account deletion): no app shell and no
 * sign-in, the academy emblem on its green tile, one title, the «last updated» line, the sections,
 * then the footer links. A readable measure on wide screens, 16px gutters on a phone.
 */
export function LegalDocument({ title, updated, children, footer }: LegalDocumentProps) {
  return (
    <div className="grid min-h-dvh justify-items-center px-4 py-10 sm:py-14">
      <main className="grid w-full max-w-[720px] content-start gap-5">
        <header className="grid justify-items-start gap-3">
          <span className="grid size-[56px] place-items-center rounded-[13px] bg-brand-tile">
            <Mark size={44} />
          </span>
          <h1 className="font-display text-h2 font-bold text-pretty">{title}</h1>
          <p className="text-sm text-ink-2">{updated}</p>
        </header>
        {children}
      </main>
      {footer ? (
        <footer className="mt-8 flex w-full max-w-[720px] flex-wrap items-center gap-x-5 gap-y-3">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
