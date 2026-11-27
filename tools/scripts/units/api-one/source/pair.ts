import ts from 'typescript';
import { narrow } from '../ast.ts';

/** The pair and its no-login twins, and the function each becomes (docs/62 part 3 §3b). */
export const PAIR_TARGET: Readonly<Record<string, string>> = {
  apiFetch: 'call',
  apiSend: 'call',
  publicApiFetch: 'publicCall',
  publicApiSend: 'publicCall',
};
export const MEMBER_TARGET = 'request';
const SENDS = new Set(['apiSend', 'publicApiSend']);
const MEMBERS = new Set(['apiFetch', 'apiSend']);

export const isPairName = (name: string): boolean => Object.hasOwn(PAIR_TARGET, name);
export const isSendName = (name: string): boolean => SENDS.has(name);

const namedOf = (s: ts.Statement): readonly ts.ImportSpecifier[] =>
  narrow(narrow(s, ts.isImportDeclaration)?.importClause?.namedBindings, ts.isNamedImports)
    ?.elements ?? [];

/** The pair names this file imports under their own names. */
export function importedPair(sf: ts.SourceFile): Map<string, string> {
  const own = sf.statements
    .flatMap(namedOf)
    .filter((e) => e.propertyName === undefined && isPairName(e.name.text));
  return new Map(own.map((e) => [e.name.text, e.name.text]));
}

/** `client.apiFetch(…)`: the member form on an injected client. */
export const memberName = (call: ts.CallExpression): string | undefined => {
  const name = narrow(call.expression, ts.isPropertyAccessExpression)?.name.text;
  return name !== undefined && MEMBERS.has(name) ? name : undefined;
};

export const plainName = (
  call: ts.CallExpression,
  imported: ReadonlyMap<string, string>,
): string | undefined => {
  const name = narrow(call.expression, ts.isIdentifier)?.text;
  return name !== undefined && imported.has(name) ? name : undefined;
};
