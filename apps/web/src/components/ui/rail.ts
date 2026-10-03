// Side panels (docs/07 §9): from the desktop breakpoint on, a rail keeps a fixed height tied to
// the window, stays in view while the page scrolls and scrolls inside itself. Below it the
// panels stack with the page, as before. Literal class strings so Tailwind generates them.
export const rail =
  'shell:sticky shell:top-4 shell:h-[calc(100dvh-7rem)] shell:overflow-y-auto shell:overscroll-contain shell:pe-1';
/** Thread side panels only split off from the message log at xl. */
export const railXl =
  'xl:sticky xl:top-4 xl:h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:pe-1';
