import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rewriteText } from '../http-error.mjs';

const BOOKING = "import { domainError } from '@/modules/teaching/booking/booking.errors';";
const WA = "import { type InboundFile, waHttpError } from '@/modules/messaging/whatsapp';";
const HTTP = "import { httpError } from '@/common/http/errors';";
const file = (imports, lines) =>
  `${imports.join('\n')}\n\nfunction f() {\n${lines.join('\n')}\n}\n`;

test('domainError keeps its argument order', () => {
  const out = rewriteText(
    file([BOOKING], ['  throw domainError(HttpStatus.CONFLICT, CODE, { at });']),
  );
  assert.equal(out.text, file([HTTP], ['  throw httpError(HttpStatus.CONFLICT, CODE, { at });']));
  assert.equal(out.sites, 1);
});

test('waHttpError swaps its code and status and keeps the other import names', () => {
  const lines = [
    "  throw waHttpError('not_configured', 503);",
    "  return waHttpError(e.code ?? 'x', 502, { meta: f(a, b) });",
  ];
  const out = rewriteText(file([WA], lines));
  const want = [
    "  throw httpError(503, 'not_configured');",
    "  return httpError(502, e.code ?? 'x', { meta: f(a, b) });",
  ];
  const imports = ["import { type InboundFile } from '@/modules/messaging/whatsapp';", HTTP];
  assert.equal(out.text, file(imports, want));
  assert.equal(out.sites, 2);
});

test('httpError joins an existing errors import, sorted, once', () => {
  const errors = "import { badRequest, notFound } from '@/common/http/errors';";
  const out = rewriteText(file([errors, BOOKING], ['  throw domainError(400, "x");']));
  const merged = "import { badRequest, httpError, notFound } from '@/common/http/errors';";
  assert.ok(out.text.split('\n').includes(merged));
  assert.equal(out.text.match(/common\/http\/errors/g)?.length, 1);
});

test('a call over several lines and a string with a comma map', () => {
  const out = rewriteText(file([WA], ["  throw waHttpError(\n    'a, b',\n    409,\n  );"]));
  assert.match(out.text, /throw httpError\(409, 'a, b'\);/);
});

test('the definitions and other names are left alone', () => {
  const lines = [
    '  export function waHttpError(code: string, status: number) {}',
    '  const myDomainError = 1;',
  ];
  const text = file([], lines);
  const out = rewriteText(text);
  assert.equal(out.text, text);
  assert.equal(out.sites, 0);
});

test('a second run finds nothing', () => {
  const once = rewriteText(file([BOOKING], ['  throw domainError(409, CODE);']));
  const twice = rewriteText(once.text);
  assert.equal(twice.text, once.text);
  assert.equal(twice.sites, 0);
});
