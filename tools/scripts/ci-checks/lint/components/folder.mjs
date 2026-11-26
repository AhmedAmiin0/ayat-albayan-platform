// Checks 1, 2, 6 and 8: the files around Name.tsx (docs/63 §3).
import { basename, dirname } from 'node:path';
import ts from 'typescript';
import { addedFailure } from '../../../units/move-only/barrel.mjs';
import { parse } from '../../comment-only/source.mjs';
import { calleeName, findHookCall, findIn } from './find.mjs';
import { isTest } from './scope.mjs';

const HOOK = /^use[A-Z]/;

export function placeFailure(tree, path, name) {
  const dir = dirname(path);
  const placed = basename(path) === `${name}.tsx` && basename(dir) === name;
  if (!placed) return `${name}.tsx belongs in its own folder ${name}/`;
  return tree.has(`${dir}/index.ts`) ? null : `${name}/ has no index.ts`;
}

const exportedNames = (sf) =>
  sf.statements.flatMap((s) =>
    ts.isExportDeclaration(s) && s.exportClause !== undefined && ts.isNamedExports(s.exportClause)
      ? s.exportClause.elements.map((e) => e.name.text)
      : [],
  );

export function indexFailure(tree, path) {
  const index = `${dirname(path)}/index.ts`;
  if (!tree.has(index)) return null;
  const text = tree.read(index);
  const hook = exportedNames(parse(text, index)).find((n) => HOOK.test(n));
  return (
    addedFailure(index, text) ?? (hook === undefined ? null : `index.ts exports the hook ${hook}`)
  );
}

const squash = (s) => s.replaceAll('-', '').toLowerCase();

const ownHookFile = (tree, dir, name) =>
  tree
    .list(dir)
    .find((f) => /^use-[^/]*\.ts$/.test(f) && squash(f.slice(0, -3)) === squash(`use${name}`));

const declaredExports = (sf) =>
  sf.statements.flatMap((s) => {
    const exported = ts.getModifiers?.(s)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) return [];
    if (ts.isVariableStatement(s))
      return s.declarationList.declarations.map((d) => d.name.getText(sf));
    return [s.name?.getText(sf) ?? 'default'];
  });

function hookFileFailure(path, text, own) {
  const sf = parse(text, path);
  const names = [...declaredExports(sf), ...exportedNames(sf)];
  if (names.length !== 1 || names[0] !== own) return `${basename(path)} exports only ${own}`;
  return findHookCall(sf) === undefined
    ? `${own} calls no hook: it belongs in a .helpers.ts`
    : null;
}

export function hookFailure(tree, c, path) {
  const dir = dirname(path);
  const own = `use${c.name}`;
  const file = ownHookFile(tree, dir, c.name);
  const calls = findIn(c.fn, (n) => ts.isCallExpression(n) && calleeName(n) === own) !== undefined;
  if (calls && file === undefined) return `${own} is called but ${dir}/use-*.ts for it is missing`;
  if (!calls && file !== undefined) return `${file} exists but ${c.name}.tsx does not call ${own}`;
  return file === undefined
    ? null
    : hookFileFailure(`${dir}/${file}`, tree.read(`${dir}/${file}`), own);
}

export function testsFailure(tree, path) {
  const dir = dirname(path);
  const beside = tree.list(dir).filter((f) => isTest(`/${f}`));
  const inside = tree.list(`${dir}/tests`).filter((f) => isTest(`/${f}`));
  const spread = beside.length > 0 && beside.length + inside.length >= 2;
  return spread
    ? `${beside.length + inside.length} tests: keep them in ${basename(dir)}/tests/`
    : null;
}
