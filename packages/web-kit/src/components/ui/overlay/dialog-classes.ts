// Dialog layouts (owner, 2026-10-05). Below `sm` (640px) a form is a full-screen sheet and a short
// confirm (delete / void / yes-no, no fields: `compact`) a floating card at the top, actions
// stacked with the primary on top. From `sm` a form is an aside: a full-height panel at the
// inline-end (like the schedule Drawer); `layout: 'center'` (wide or visual content: comparisons,
// receipts, media) and compact confirms are the floating card in the middle.
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
const phoneSheet = 'max-sm:h-dvh max-sm:max-w-none max-sm:animate-fade-up max-sm:rounded-none max-sm:border-0 max-sm:shadow-none';
const phoneHeader = 'max-sm:border-b max-sm:border-rule max-sm:bg-card max-sm:px-4 max-sm:pt-[max(1rem,env(safe-area-inset-top))] max-sm:pb-3';
const phoneFooter = 'max-sm:mt-0 max-sm:gap-y-2.5 max-sm:bg-card max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]';

/** Phones: the sheet. From `sm`: the floating card in the middle of the scrim. */
export const sheetLayout: DialogLayout = {
  overlay: 'fixed inset-0 z-50 animate-fade-in bg-scrim sm:grid sm:place-items-center sm:overflow-y-auto sm:p-6',
  panel: `${card} sm:animate-pop-in`,
  phone: phoneSheet,
  header: phoneHeader,
  body: 'min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:p-4 sm:-mx-1 sm:mt-5 sm:px-1',
  bodyAlone: 'max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]',
  footer: `${footer} ${phoneFooter}`,
  hint: `${hint} max-sm:empty:hidden`,
};

/**
 * Phones: the same sheet. From `sm`: a full-height panel at the inline-end (left in RTL), title
 * row pinned on top, only the body scrolls, the actions a bar at the bottom. `animate-drawer-in`
 * is unprefixed so motion.css's `[dir='ltr'] .animate-drawer-in` flips it; phones override it.
 */
export const asideLayout: DialogLayout = {
  overlay: 'fixed inset-0 z-50 flex animate-fade-in justify-end bg-scrim',
  panel:
    'relative flex h-dvh w-full animate-drawer-in flex-col shadow-pop sm:max-w-[520px] sm:rounded-none sm:border-0 sm:border-s sm:border-rule',
  phone: phoneSheet,
  header: `${phoneHeader} sm:border-b sm:border-rule sm:bg-card sm:px-6 sm:pt-[22px] sm:pb-4`,
  body: 'min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:p-4 sm:px-6 sm:py-5',
  bodyAlone: 'pb-[max(1rem,env(safe-area-inset-bottom))]',
  footer: `${footer} mt-0 bg-card ${phoneFooter} sm:px-6 sm:pt-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]`,
  hint: `${hint} max-sm:empty:hidden`,
};

/**
 * `layout: 'sheet'`: a BOTTOM sheet on phones (one value to edit: the page stays visible above it,
 * rounded top corners, as tall as its content up to 85% of the screen, the body scrolls). From `sm`
 * the floating card in the middle, like `center`.
 */
export const bottomSheetLayout: DialogLayout = {
  ...sheetLayout,
  overlay: 'fixed inset-0 z-50 flex animate-fade-in flex-col justify-end bg-scrim sm:grid sm:place-items-center sm:overflow-y-auto sm:p-6',
  phone: 'max-sm:max-h-[85dvh] max-sm:max-w-none max-sm:animate-fade-up max-sm:rounded-t-lg max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0',
  header: 'max-sm:border-b max-sm:border-rule max-sm:bg-card max-sm:px-4 max-sm:pt-4 max-sm:pb-3',
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

export interface LayoutOptions {
  compact?: boolean;
  layout?: 'aside' | 'center' | 'sheet';
  /** Aside only: a 720px panel for big forms (two columns of fields). */
  wide?: boolean;
}

/** Compact wins over `layout`; a form is an aside unless it asks for the centred card. */
export function pickLayout({ compact, layout, wide }: LayoutOptions): DialogLayout {
  if (compact) return compactLayout;
  if (layout === 'center') return sheetLayout;
  if (layout === 'sheet') return bottomSheetLayout;
  return wide ? { ...asideLayout, panel: `${asideLayout.panel} sm:max-w-[720px]` } : asideLayout;
}
