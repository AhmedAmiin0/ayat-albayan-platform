import ts from 'typescript';
import { declaredNames, readsAny } from '../../model/names.ts';
import { no, ok } from '../../model/result.ts';
import { HOOK, isExported } from '../../model/source.ts';
import type { Result } from '../../model/model.types.ts';
import type { Group } from './adopt.types.ts';

const isReexport = (s: ts.Statement): boolean =>
  ts.isExportDeclaration(s) || ts.isExportAssignment(s);

function rootsOf(body: readonly ts.Statement[], own: string): Result<string[]> {
  const names = body.filter(isExported).flatMap(declaredNames);
  const bad = names.find((n) => !HOOK.test(n));
  if (bad !== undefined) return no(`the hook file exports ${bad}, not a hook`);
  return names.includes(own) ? ok(names) : no(`the hook file does not declare ${own}`);
}

/** Private statements each root reaches through other private statements. */
function reach(root: ts.Statement, privates: ReadonlyMap<string, ts.Statement>): Set<ts.Statement> {
  const seen = new Set<ts.Statement>();
  const queue = [root];
  for (let d = queue.shift(); d !== undefined; d = queue.shift()) {
    const next = [...readsAny([d])]
      .flatMap((n) => privates.get(n) ?? [])
      .filter((x) => !seen.has(x));
    next.forEach((x) => seen.add(x));
    queue.push(...next);
  }
  return seen;
}

type Claim = readonly [ts.Statement, string];

function ownersOf(body: readonly ts.Statement[]): Result<Map<ts.Statement, string>> {
  const privates = new Map(
    body.filter((s) => !isExported(s)).flatMap((s) => declaredNames(s).map((n) => [n, s] as const)),
  );
  const claims = body.filter(isExported).flatMap((root): Claim[] => {
    const name = declaredNames(root)[0] ?? '';
    return [...reach(root, privates)].map((d) => [d, name]);
  });
  const rival = (c: Claim): Claim | undefined => claims.find(([d, n]) => d === c[0] && n !== c[1]);
  const clash = claims.find((c) => rival(c) !== undefined);
  if (clash === undefined) return ok(new Map(claims));
  const other = rival(clash)?.[1] ?? '';
  return no(`${declaredNames(clash[0]).join(', ')} is read by ${clash[1]} and ${other}`);
}

/** The hook file's statements grouped by the exported hook that needs them (docs/63 §2). */
export function partition(sf: ts.SourceFile, own: string): Result<Group[]> {
  const body = sf.statements.filter((s) => !ts.isImportDeclaration(s));
  if (body.some(isReexport)) return no('the hook file re-exports other modules');
  const roots = rootsOf(body, own);
  if (!roots.ok) return no(roots.why);
  const owners = ownersOf(body);
  if (!owners.ok) return no(owners.why);
  const ownerOf = (s: ts.Statement): string =>
    isExported(s) ? (declaredNames(s)[0] ?? own) : (owners.value.get(s) ?? own);
  return ok(
    roots.value.map((root) => ({ root, statements: body.filter((s) => ownerOf(s) === root) })),
  );
}
