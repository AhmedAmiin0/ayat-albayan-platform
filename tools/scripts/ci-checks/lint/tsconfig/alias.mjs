// A package never imports through `@/` (CLAUDE.md rule 13). Packages ship source that each app
// compiles, and every tool there resolves `@/` against the app's own src, so an alias inside a
// package points at the wrong folder the moment an app builds it.
import { ts } from 'ts-morph';

const CODE = /^packages\/.+\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const VENDORED = /(^|\/)node_modules\//;
const ALIAS = '@/';

/** True for a source file under packages/ that is not vendored. */
export const isPackageCode = (path) => CODE.test(path) && !VENDORED.test(path);

/** One line per import, export-from, import() or require() of `text` that names `@/…`. */
export function aliasImports(text) {
  const { importedFiles } = ts.preProcessFile(text, true, true);
  return importedFiles
    .map((file) => file.fileName)
    .filter((name) => name.startsWith(ALIAS))
    .map((name) => `imports "${name}": a package never uses @/ (apps only)`);
}
