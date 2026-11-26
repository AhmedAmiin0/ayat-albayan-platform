import type { PageInput, PageWindow } from './page.types';

/** The inclusive row window of a 1-based page, for `.range` or an RPC's limit and offset. */
export function pageWindow(input: PageInput): PageWindow {
  const from = (input.page - 1) * input.pageSize;
  return { from, to: from + input.pageSize - 1 };
}
