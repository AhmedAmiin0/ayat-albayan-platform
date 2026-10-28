import { createHash } from 'node:crypto';
import { palette } from '@ab/shared';

const c = palette.light;

/**
 * The family pages' only style (the brand tokens, @ab/shared theme: white page, emerald action), readable on
 * a phone. Inline in <style>, allowed by its hash alone (PAGE_CSP): no script, no other source.
 */
export const PAY_CSS = [
  `*{box-sizing:border-box}`,
  `body{margin:0;background:${c.margin};color:${c.ink};font:17px/1.6 system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif}`,
  `main{max-width:28rem;margin:2rem auto;padding:1.5rem;background:${c.page};border:1px solid ${c.rule};border-radius:16px}`,
  `h1{margin:0 0 1rem;font-size:1.25rem;color:${c.coverInk}}`,
  `p{margin:.5rem 0}`,
  `.amount{font-size:1.4rem;font-weight:700}`,
  `.state{padding:.75rem 1rem;border-radius:12px;background:${c.sunk};color:${c.ink2}}`,
  `.btn{display:block;margin:1.25rem 0 .5rem;padding:.9rem 1rem;border-radius:12px;background:${c.lapisFill};color:${c.onLapis};text-align:center;font-weight:700;text-decoration:none}`,
  `.link{color:${c.lapis}}`,
  `.note{margin-top:1.25rem;font-size:.85rem;color:${c.ink3}}`,
].join('');

const CSS_HASH = createHash('sha256').update(PAY_CSS).digest('base64');

/** Strict CSP: nothing loads, nothing runs; only the inline style above, by hash. */
export const PAGE_CSP = [
  `default-src 'none'`,
  `style-src 'sha256-${CSS_HASH}'`,
  `base-uri 'none'`,
  `form-action 'none'`,
  `frame-ancestors 'none'`,
].join('; ');
