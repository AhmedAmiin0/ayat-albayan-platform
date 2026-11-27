import ts from 'typescript';
import { lineOf } from '../ast.ts';
import { findAll } from '../../units/components/model/source.ts';
import {
  importedPair,
  isSendName,
  MEMBER_TARGET,
  memberName,
  PAIR_TARGET,
  plainName,
} from './pair.ts';
import { fetchObject, sendObject } from './request-object.ts';
import type { Built, Found, Named, Planned } from './source.types.ts';

interface Context {
  imported: ReadonlyMap<string, string>;
  calls: readonly ts.CallExpression[];
  /** Why a plain call cannot become call() here (a local binding of that name). */
  blocked: (target: string) => string | undefined;
}

function namedOf(call: ts.CallExpression, imported: ReadonlyMap<string, string>): Named {
  const plain = plainName(call, imported);
  return plain === undefined
    ? { name: memberName(call) ?? '', target: MEMBER_TARGET, plain: false }
    : { name: plain, target: PAIR_TARGET[plain] ?? '', plain: true };
}

const typeArgs = (call: ts.CallExpression): string =>
  call.typeArguments ? `<${call.typeArguments.map((t) => t.getText()).join(', ')}>` : '';

const calleeText = (call: ts.CallExpression, target: string): string =>
  ts.isPropertyAccessExpression(call.expression)
    ? `${call.expression.expression.getText()}.${target}`
    : target;

function rewrite(call: ts.CallExpression, { name, target }: Named): Built {
  const built = isSendName(name) ? sendObject(call.arguments) : fetchObject(call.arguments);
  const head = `${calleeText(call, target)}${typeArgs(call)}`;
  return built.kind === 'text' ? { kind: 'text', text: `${head}(${built.text})` } : built;
}

const inside = (inner: ts.Node, outer: ts.Node): boolean =>
  inner !== outer && inner.getStart() >= outer.getStart() && inner.getEnd() <= outer.getEnd();

function reasonOf(call: ts.CallExpression, named: Named, ctx: Context): string | undefined {
  const nested = ctx.calls.some((other) => inside(other, call)) ? 'a pair call inside' : undefined;
  return (named.plain ? ctx.blocked(named.target) : undefined) ?? nested;
}

function planOne(call: ts.CallExpression, ctx: Context): Planned {
  const named = namedOf(call, ctx.imported);
  const reason = reasonOf(call, named, ctx);
  const built: Built = reason === undefined ? rewrite(call, named) : { kind: 'refused', reason };
  const line = lineOf(call);
  if (built.kind === 'refused') {
    return {
      found: { line, result: 'left', reason: `${named.name}: ${built.reason}` },
      edit: undefined,
    };
  }
  const edit = { start: call.getStart(), end: call.getEnd(), value: built.text };
  const found: Found = { line, result: 'rewritten', reason: `${named.name} → ${named.target}` };
  return { found, edit: { edit, named } };
}

/** Every pair call in the file: its edit, or why it stays. */
export function planCalls(sf: ts.SourceFile, blocked: Context['blocked']): Planned[] {
  const imported = importedPair(sf);
  const isPairCall = (n: ts.Node): n is ts.CallExpression =>
    ts.isCallExpression(n) && (plainName(n, imported) ?? memberName(n)) !== undefined;
  const calls = findAll(sf, isPairCall).filter(isPairCall);
  return calls.map((call) => planOne(call, { imported, calls, blocked }));
}
