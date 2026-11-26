// The raw db error codemod (docs/62 part 1 §3.1, E): in api repo and query files, a guard that
// throws `new Error(… <err>.message …)` for the error it tested throws pgError(<err>) instead, so a
// 23505, 23503 or PGRST103 answers through the default map. Line-based and deterministic; any other
// `new Error(… .message …)` stays and is listed. A second run finds nothing.
// Usage: node tools/scripts/imports/db-raw-error/db-raw-error.mjs [--write]   (dry run without it)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ERRORS_SOURCE = '@/common/db/errors';
const GUARD = /^(\s*)if \(([\w.]+)\) throw new Error\((.*)\);\s*$/;
const RAW = /new Error\(.*\.message/;
const ERRORS_IMPORT = /^import \{ ([^}]*) \} from '@\/common\/db\/errors';$/m;
const FILES = /\.(repo|queries)\.ts$/;
const IMPORT_END = /^(import .*|\}) from '[^']+';$/;
const TEST = /\.test\.ts$/;

const namesError = (arg, err) =>
  arg === `${err}.message` || (arg.startsWith('`') && arg.includes(`\${${err}.message}`));

/** pgError takes a PostgrestError; a name the file also types as `{ message: string }` may not be one. */
const looselyTyped = (text, err) => {
  const name = err.split('.').at(-1) ?? err;
  return new RegExp(`\\b${name}\\??: \\{ message: string \\}`).test(text);
};

function rewriteLine(line, text) {
  const m = GUARD.exec(line);
  if (m === null) return null;
  const [, indent, err, arg] = m;
  const mapped = namesError(arg, err) && !looselyTyped(text, err);
  return mapped ? `${indent}if (${err}) throw pgError(${err});` : null;
}

function withImport(text) {
  const found = ERRORS_IMPORT.exec(text);
  if (found !== null) {
    const names = found[1].split(',').map((n) => n.trim());
    const sorted = [...new Set([...names, 'pgError'])].sort();
    return text.replace(ERRORS_IMPORT, `import { ${sorted.join(', ')} } from '${ERRORS_SOURCE}';`);
  }
  const lines = text.split('\n');
  const last = lines.findLastIndex((l) => IMPORT_END.test(l));
  lines.splice(last + 1, 0, `import { pgError } from '${ERRORS_SOURCE}';`);
  return lines.join('\n');
}

/** `text` with every mapped guard rewritten, the count and the raw sites left (1-based lines). */
export function rewriteText(text) {
  const unmapped = [];
  let sites = 0;
  const lines = text.split('\n').map((line, i) => {
    const next = rewriteLine(line, text);
    if (next !== null) sites += 1;
    if (next === null && RAW.test(line)) unmapped.push({ line: i + 1, text: line.trim() });
    return next ?? line;
  });
  const joined = lines.join('\n');
  return { text: sites > 0 ? withImport(joined) : joined, sites, unmapped };
}

function filesUnder(root, rel) {
  const entries = readdirSync(posix.join(root, rel), { withFileTypes: true });
  return entries.flatMap((e) => {
    const path = posix.join(rel, e.name);
    if (e.isDirectory()) return filesUnder(root, path);
    return FILES.test(e.name) && !TEST.test(e.name) ? [path] : [];
  }).sort();
}

/** Rewrites (or with `write: false` only counts) every api repo and query file. */
export function run(root, { write }) {
  const report = { files: 0, sites: 0, unmapped: [] };
  for (const file of filesUnder(root, 'apps/api/src')) {
    const out = rewriteText(readFileSync(posix.join(root, file), 'utf8'));
    report.unmapped.push(...out.unmapped.map((u) => ({ file, ...u })));
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
  console.log(`db-raw-error: ${r.sites} sites in ${r.files} files`);
  for (const u of r.unmapped) console.log(`  unmapped ${u.file}:${u.line} ${u.text}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
