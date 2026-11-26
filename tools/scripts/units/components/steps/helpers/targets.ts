import ts from 'typescript';
import { calleeName, findAll, HOOK, kebabOf } from '../../model/source.ts';
import { declaredNames } from '../../model/names.ts';

// Where a moved top-level declaration goes (docs/57 §2.12 file suffixes); a hook gets its own
// `use-<purpose>.ts`, never a helpers file (docs/63 §4 step 3).
const BY_CALL: [RegExp, string][] = [
  [/^create$/, 'style'],
  [/^cva$/, 'variants'],
  [/^createContext$/, 'context'],
];

const initCalls = (s: ts.Statement): string[] =>
  ts.isVariableStatement(s)
    ? s.declarationList.declarations.flatMap((d) =>
        d.initializer !== undefined && ts.isCallExpression(d.initializer)
          ? [calleeName(d.initializer)]
          : [],
      )
    : [];

const isStyleSheet = (s: ts.Statement): boolean =>
  findAll(s, (n) => ts.isPropertyAccessExpression(n) && n.getText() === 'StyleSheet.create')
    .length > 0;

/** The file stem a declaration moves to, beside `Name.tsx`. */
export function targetOf(s: ts.Statement, name: string): string {
  const hook = declaredNames(s).find((n) => HOOK.test(n));
  if (hook !== undefined) return `use-${kebabOf(hook.slice(3))}`;
  const call = initCalls(s)[0] ?? '';
  const suffix =
    BY_CALL.find(([re]) => re.test(call) && (call !== 'create' || isStyleSheet(s)))?.[1] ??
    'helpers';
  return `${kebabOf(name)}.${suffix}`;
}
