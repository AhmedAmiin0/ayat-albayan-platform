// Side panels (docs/07 §9): from the desktop breakpoint on, a rail keeps a fixed height tied to
// the window, stays in view while the page scrolls and scrolls inside itself. Below it the
// panels stack with the page, as before. Literal class strings so Tailwind generates them.
// Inside a fixed-height layout (FixedTopBarLayout) the scroll area sets --rail-top and --rail-h to
// its own box (use-rail-box.ts), so a rail fits under the pinned page head instead of the window.
export const rail =
  'shell:sticky shell:top-[var(--rail-top,1rem)] shell:h-[var(--rail-h,calc(100dvh-7rem))] shell:overflow-y-auto shell:overscroll-contain shell:pe-1';
/** Thread side panels (the inbox's fixed-height pane, owner 2026-10-05): from 900px a panel fills
 *  its grid cell and scrolls inside it; on phones it flows with the page. */
export const railXl = 'shell:h-full shell:min-h-0 shell:overflow-y-auto shell:overscroll-contain shell:pe-1';
/** A column of a viewport-high screen (the inbox list): fills its grid row, scrolls on its own. */
export const paneScroll = 'shell:h-full shell:min-h-0 shell:overflow-y-auto shell:overscroll-contain shell:pe-1';
