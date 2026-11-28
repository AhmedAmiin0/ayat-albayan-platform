/**
 * Thread side panels (the inbox's fixed-height pane, container `thread`): once the thread is wide
 * enough to hold the panel beside the log, it fills its grid cell and scrolls inside it; below
 * that it flows under the log, so the reply box keeps the thread's width.
 */
export const railThread =
  '@3xl/thread:h-full @3xl/thread:min-h-0 @3xl/thread:overflow-y-auto ' +
  '@3xl/thread:overscroll-contain @3xl/thread:pe-1';
/** A column of a viewport-high screen (the inbox list): fills its grid row, scrolls on its own. */
export const paneScroll = 'shell:h-full shell:min-h-0 shell:overflow-y-auto shell:overscroll-contain shell:pe-1';
