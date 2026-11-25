import { posix } from 'node:path';
import type { ImportDecl } from '../../model/imports.ts';

const APP_SRC = /^apps\/[^/]+\/src\//;

/** How a file in `fromDir` imports `target` (repo path): `@/…` in an app, relative elsewhere. */
export function specTo(fromDir: string, target: string): string {
  const app = APP_SRC.exec(target)?.[0];
  if (app !== undefined && fromDir.startsWith(app.slice(0, -1)))
    return `@/${target.slice(app.length)}`;
  const rel = posix.relative(fromDir, target);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/** A relative import of `fromDir` re-pointed for a file one folder down. */
export const repoint = (d: ImportDecl, fromDir: string, toDir: string): ImportDecl =>
  d.spec.startsWith('.') ? { ...d, spec: specTo(toDir, posix.join(fromDir, d.spec)) } : d;
