/** Page numbers to show: first, last and a window around `page`; 'gap' renders «…» (only for 2+). */
export function pageList(page: number, pages: number): (number | 'gap')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3].forEach((n) => keep.add(n));
  if (page >= pages - 2) [pages - 1, pages - 2].forEach((n) => keep.add(n));
  const shown = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return shown.flatMap((n, i) => {
    const prev = shown[i - 1];
    if (prev === undefined || n - prev === 1) return [n];
    return n - prev === 2 ? [prev + 1, n] : ['gap' as const, n];
  });
}

/** Total pages for a server-side paged list (R-NFR-08); at least 1. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
