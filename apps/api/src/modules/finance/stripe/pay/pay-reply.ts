import { PAGE_CSP } from './pay-css';

/** What the controller needs of Fastify's reply (passthrough: Nest still sends the returned body). */
export interface HtmlReply {
  status(code: number): unknown;
  header(name: string, value: string): unknown;
}

/** The request parts the page reads. */
export interface PayRequest {
  ip: string;
  params: { token?: string };
  /** ?from=android|ios (the app opened the link) and ?auto=0 (the app's fallback: no automatic try); never echoed. */
  query?: { from?: unknown; auto?: unknown };
  headers: { accept?: string | string[]; cookie?: string };
}

/** A token as the API makes them (link-ids.ts); anything else is not looked up. */
export const isLinkToken = (token: string): boolean => /^[A-Za-z0-9_-]{32,64}$/.test(token);

/** The web PayPage asks for JSON (Accept: application/json); a browser that opens the link gets HTML. */
export const wantsJson = (req: PayRequest): boolean => /application\/json/i.test(String(req.headers.accept ?? ''));

/** The family pages' headers: never cached, nothing framed, sniffed or referred, the strict CSP. */
export function html(res: HtmlReply, page: { status: number; body: string }): string {
  res.status(page.status);
  res.header('Content-Type', 'text/html; charset=utf-8');
  res.header('Cache-Control', 'no-store');
  res.header('Content-Security-Policy', PAGE_CSP);
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('Referrer-Policy', 'no-referrer');
  return page.body;
}
