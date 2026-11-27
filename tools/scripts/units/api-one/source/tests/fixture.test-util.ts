import assert from 'node:assert/strict';
import { rewriteSource } from '../source-file.ts';

const WEB = "import { apiFetch, apiSend } from '@ab/web-kit';\n";

/** The file after the codemod, its import line left out when it is the plain kit import. */
export function rewritten(body: string, head = WEB): string {
  return rewriteSource('apps/x/src/a.ts', `${head}${body}`).text;
}

export function expectRewrite(body: string, expected: string): void {
  const out = rewriteSource('apps/x/src/a.ts', `${WEB}${body}`);
  assert.equal(out.text.split('\n').slice(1).join('\n'), expected);
  assert.ok(
    out.found.every((f) => f.result === 'rewritten'),
    JSON.stringify(out.found),
  );
}

export function expectLeft(body: string, reason: RegExp): void {
  const out = rewriteSource('apps/x/src/a.ts', `${WEB}${body}`);
  assert.ok(
    out.found.some((f) => f.result === 'left' && reason.test(f.reason)),
    JSON.stringify(out.found),
  );
}
