import { expect, type Page, type Request } from '@playwright/test';

/** The same quiet window as Playwright's 'networkidle'. */
const QUIET_MS = 500;
const LOAD_WAIT = { timeout: 30_000, intervals: [100] };
/** Only the network counts: a blob: or data: read never reports finished (seen on /admin/book). */
const isNetwork = (request: Request): boolean => /^https?:/.test(request.url());

/**
 * Opens the path and waits until the page's own loads are done: every URL it asked for the first
 * time has answered and nothing new started for QUIET_MS. A URL asked again is a poll and never
 * holds the wait. 'networkidle' counts polls too: the shell's unread badge asks every second in e2e
 * (VITE_INBOX_REFRESH_MS, no realtime in the CI stack), and once a slow runner answers it in more
 * than half a second the network is never idle and the wait runs out the test's budget.
 */
export async function gotoLoaded(page: Page, path: string): Promise<void> {
  const seen = new Set<string>();
  const open = new Set<Request>();
  let last = Date.now();
  const isRepeatOrLocal = (request: Request) => !isNetwork(request) || seen.has(request.url());
  const start = (request: Request) => {
    if (isRepeatOrLocal(request)) return;
    seen.add(request.url());
    open.add(request);
    last = Date.now();
  };
  const end = (request: Request) => {
    last = open.delete(request) ? Date.now() : last;
  };
  const stillLoading = () => (Date.now() - last < QUIET_MS ? ['(quiet window)'] : urls(open));
  page.on('request', start);
  page.on('requestfinished', end);
  page.on('requestfailed', end);
  const t0 = Date.now();
  try {
    await page.goto(path);
    process.stdout.write(`[diag] ${path} load ${Date.now() - t0}ms\n`);
    await expect.poll(stillLoading, { ...LOAD_WAIT, message: `${path} loaded` }).toEqual([]);
    process.stdout.write(`[diag] ${path} loaded ${Date.now() - t0}ms, ${seen.size} urls\n`);
  } finally {
    page.off('request', start);
    page.off('requestfinished', end);
    page.off('requestfailed', end);
  }
}

const urls = (requests: ReadonlySet<Request>): string[] => [...requests].map((r) => r.url());
