// Dialog layouts. From `sm` (640px) both are the same floating card. Below it a form is a
// full-screen sheet (owner, 2026-10-05); a short confirm (delete / void / yes-no, no fields) stays
// the floating card at the top with the actions stacked, primary on top (`compact`).
// Literal class strings so Tailwind generates them.

export interface DialogLayout {
  overlay: string;
  panel: string;
  /** Phone-only overrides listed after the caller's className, so they beat its `max-w-*`. */
  phone: string;
  header: string;
  body: string;
  /** The body's extra bottom room on phones when there is no footer (the home indicator). */
  bodyAlone: string;
  footer: string;
  hint: string;
}

const card = 'relative mx-auto flex w-full max-w-[740px] flex-col shadow-pop sm:max-h-[calc(100dvh-3rem)] sm:px-7 sm:pt-[26px] sm:pb-[22px]';
const footer = 'mt-5 flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-3.5 border-t border-rule pt-[18px]';
const hint = 'max-w-[32ch] text-xs text-ink-3';

export const sheetLayout: DialogLayout = {
  overlay: 'fixed inset-0 z-50 animate-fade-in bg-scrim sm:grid sm:place-items-center sm:overflow-y-auto sm:p-6',
  panel: `${card} sm:animate-pop-in`,
  phone: 'max-sm:h-dvh max-sm:max-w-none max-sm:animate-fade-up max-sm:rounded-none max-sm:border-0 max-sm:shadow-none',
  header: 'max-sm:border-b max-sm:border-rule max-sm:bg-card max-sm:px-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pb-3',
  body: 'min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:p-4 sm:-mx-1 sm:mt-5 sm:px-1',
  bodyAlone: 'max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]',
  footer: `${footer} max-sm:mt-0 max-sm:gap-y-2.5 max-sm:bg-card max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]`,
  hint: `${hint} max-sm:empty:hidden`,
};

export const compactLayout: DialogLayout = {
  overlay:
    'fixed inset-0 z-50 grid animate-fade-in place-items-start overflow-y-auto bg-scrim p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:place-items-center sm:p-6',
  panel: `${card} max-h-[calc(100dvh-1.5rem)] animate-pop-in px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]`,
  phone: '',
  header: '',
  body: '-mx-1 mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1',
  bodyAlone: '',
  footer,
  hint,
};
