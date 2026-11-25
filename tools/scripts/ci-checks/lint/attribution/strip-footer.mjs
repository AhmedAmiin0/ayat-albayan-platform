// PR and issue bodies name no tool (CLAUDE.md «No AI mentions in git»), but some editors append an
// attribution footer each time they save a body. Usage: node strip-footer.mjs < body.md > clean.md
// prints the body without that footer and exits 0, or prints nothing and exits 1 when it has none.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FOOTER = /^\s*(?:\u{1F916}\s*)?_?Generated (?:by|with) \[[^\]]*\]\([^)]*\)_?\s*$/u;
const TRAILING = /^\s*(?:---)?\s*$/;

/** The body without its attribution footer and the separator above it; null when it has none. */
export function stripFooter(body) {
  const lines = body.split(/\r?\n/);
  const kept = lines.filter((line) => !FOOTER.test(line));
  if (kept.length === lines.length) return null;
  while (kept.length > 0 && TRAILING.test(kept.at(-1))) kept.pop();
  return `${kept.join('\n')}\n`;
}

function main() {
  const clean = stripFooter(readFileSync(0, 'utf8'));
  process.stdout.write(clean ?? '');
  process.exitCode = clean === null ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
