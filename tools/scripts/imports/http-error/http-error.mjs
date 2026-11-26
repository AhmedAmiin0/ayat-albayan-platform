// The http error codemod (docs/62 part 1 §3.2, E): every domainError(status, code, details?) and
// waHttpError(code, status, details?) call in apps/api/src becomes httpError(status, code,
// details?), imported from '@/common/http/errors'. The body each one builds is the same, so no
// answer changes. A second run finds nothing.
// Usage: node tools/scripts/imports/http-error/http-error.mjs [--write]   (dry run without it)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE = '@/common/http/errors';
const CALL = /(?<![\w.]|function )(domainError|waHttpError)\(/g;
const IMPORT = /^import \{([^}]*)\} from '([^']+)';$/gm;
const OLD = new Set(['domainError', 'waHttpError']);
const ORDER = {
  domainError: (args) => args,
  waHttpError: ([code, status, ...rest]) => [status, code, ...rest],
};
const OPEN = new Set(['(', '[', '{']);
const CLOSE = new Set([')', ']', '}']);

/** The index past a string literal starting at `i`, template literals included. */
function skipString(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== quote) j += text[j] === '\\' ? 2 : 1;
  return j + 1;
}

/** The top-level arguments of the call whose `(` is at `open`, and the index of its `)`. */
function argsOf(text, open) {
  const args = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open + 1; i < text.length; ) {
    const c = text[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(text, i); continue; }
    if (OPEN.has(c)) depth += 1;
    if (CLOSE.has(c) && depth === 0) {
      args.push(text.slice(start, i));
      return { args: args.map((a) => a.trim()).filter((a) => a !== ''), end: i };
    }
    if (CLOSE.has(c)) depth -= 1;
    if (c === ',' && depth === 0) { args.push(text.slice(start, i)); start = i + 1; }
    i += 1;
  }
  throw new Error(`unbalanced call at ${open}`);
}

function rewriteCalls(text) {
  let out = '';
  let from = 0;
  let sites = 0;
  for (const m of text.matchAll(CALL)) {
    if (m.index < from) continue;
    const open = m.index + m[0].length - 1;
    const { args, end } = argsOf(text, open);
    out += `${text.slice(from, m.index)}httpError(${ORDER[m[1]](args).join(', ')})`;
    from = end + 1;
    sites += 1;
  }
  return { text: out + text.slice(from), sites };
}

const namesOf = (list) => list.split(',').map((n) => n.trim()).filter((n) => n !== '');

function fixImports(text) {
  const kept = text.replace(IMPORT, (line, list, source) => {
    const names = namesOf(list).filter((n) => !OLD.has(n));
    if (names.length === namesOf(list).length) return line;
    return names.length === 0 ? '\0' : `import { ${names.join(', ')} } from '${source}';`;
  }).replace(/\0\n/g, '');
  const existing = new RegExp(`^import \\{([^}]*)\\} from '${SOURCE}';$`, 'm');
  const found = existing.exec(kept);
  if (found !== null) {
    const names = [...new Set([...namesOf(found[1]), 'httpError'])].sort();
    return kept.replace(existing, `import { ${names.join(', ')} } from '${SOURCE}';`);
  }
  const lines = kept.split('\n');
  const last = lines.findLastIndex((l) => /^(import .*|\}) from '[^']+';$/.test(l));
  lines.splice(last + 1, 0, `import { httpError } from '${SOURCE}';`);
  return lines.join('\n');
}

/** `text` with every old helper call rewritten, and the number of calls. */
export function rewriteText(text) {
  const out = rewriteCalls(text);
  return { text: out.sites > 0 ? fixImports(out.text) : text, sites: out.sites };
}

function filesUnder(root, rel) {
  const entries = readdirSync(posix.join(root, rel), { withFileTypes: true });
  return entries.flatMap((e) => {
    const path = posix.join(rel, e.name);
    if (e.isDirectory()) return filesUnder(root, path);
    return e.name.endsWith('.ts') ? [path] : [];
  }).sort();
}

/** Rewrites (or with `write: false` only counts) every api file. */
export function run(root, { write }) {
  const report = { files: 0, sites: 0 };
  for (const file of filesUnder(root, 'apps/api/src')) {
    const out = rewriteText(readFileSync(posix.join(root, file), 'utf8'));
    if (out.sites === 0) continue;
    report.files += 1;
    report.sites += out.sites;
    if (write) writeFileSync(posix.join(root, file), out.text);
  }
  return report;
}

function main(args) {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const r = run(root, { write: args.includes('--write') });
  console.log(`http-error: ${r.sites} sites in ${r.files} files`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
