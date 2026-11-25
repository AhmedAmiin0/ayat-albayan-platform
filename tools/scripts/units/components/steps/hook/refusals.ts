import ts from 'typescript';
import type { Component } from '../../model/components.ts';
import type { Parts } from '../../model/parts.ts';
import { calleeName, findAll, has, HOOK, isCallTo, isJsx } from '../../model/source.ts';

// Shapes the hook step leaves for hand work (docs/63 §4 step 5.9): moving them would hide a rule
// 19/21 violation in a local hook or change behaviour.
const MEMO = /^(?:memo|useMemo|useCallback)$/;
const EFFECT = /^use(?:Layout)?Effect$/;
const HTTP = /^api(?:Fetch|Send)$/;

const callIn = (nodes: readonly ts.Node[], names: RegExp): ts.Node | undefined =>
  nodes.flatMap((n) => findAll(n, (x) => isCallTo(x, names)))[0];

const BODY_RULES: [string, (p: Parts) => boolean][] = [
  ['narrowing after guard', (p) => p.stray !== undefined],
  ['no final return', (p) => p.ret === undefined],
  ['memo, useMemo or useCallback', (p) => callIn(p.setup, MEMO) !== undefined],
  ['a raw useEffect or useLayoutEffect', (p) => callIn(p.setup, EFFECT) !== undefined],
  ['apiFetch or apiSend', (p) => callIn(p.setup, HTTP) !== undefined],
  ['a JSX const before the return', (p) => p.setup.some((s) => has(s, isJsx))],
];

const isLocalHook = (s: ts.Statement): boolean =>
  (ts.isFunctionDeclaration(s) && HOOK.test(s.name?.text ?? '')) ||
  (ts.isVariableStatement(s) &&
    s.declarationList.declarations.some((d) => HOOK.test(d.name.getText())));

const isType = (s: ts.Statement): boolean =>
  ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s);

const FILE_RULES: [string, (sf: ts.SourceFile, comps: Component[]) => boolean][] = [
  ['several components in the file (split step first)', (_sf, comps) => comps.length > 1],
  ['a hook defined in the file', (sf) => sf.statements.some(isLocalHook)],
  ['types in the file (types step first)', (sf) => sf.statements.some(isType)],
];

interface Subject {
  sf: ts.SourceFile;
  comps: Component[];
  c: Component;
  parts: Parts;
}

/** The first reason the hook step leaves `c` alone, or undefined. */
export function refusalOf(at: Subject): string | undefined {
  if (at.c.wrapped) return 'forwardRef or memo around the component';
  const file = FILE_RULES.find(([, holds]) => holds(at.sf, at.comps))?.[0];
  return file ?? BODY_RULES.find(([, holds]) => holds(at.parts))?.[0];
}

const isOwnHookCall = (n: ts.Node): n is ts.CallExpression =>
  isCallTo(n, HOOK) && calleeName(n) !== 'useTheme';

/** Hook calls of the body other than `useTheme`; none means the component gets no hook. */
export const ownHookCalls = (body: ts.Node): ts.CallExpression[] =>
  findAll(body, isOwnHookCall).filter(ts.isCallExpression);
