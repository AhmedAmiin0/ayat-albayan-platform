import ts from 'typescript';
import { narrow } from '../ast.ts';
import { handlerText } from './handler.ts';
import type { MockKind, Use } from './mocks.types.ts';

export const MOCK = 'mockApi';
const LIST: Record<MockKind, string> = { read: 'reads', write: 'writes' };
const ON: Record<MockKind, string> = { read: 'onRead', write: 'onWrite' };
const SHAPES: Record<MockKind, { fields: readonly string[]; head: string[]; least: number }> = {
  read: { fields: ['path'], head: ["method: 'GET'"], least: 1 },
  write: { fields: ['method', 'path', 'body'], head: [], least: 2 },
};
const RESETS: Readonly<Partial<Record<string, string>>> = {
  mockReset: 'reset',
  mockClear: 'clear',
};

const replace = (node: ts.Node, value: string): Use => ({
  ok: true,
  edit: { start: node.getStart(), end: node.getEnd(), value },
});

const withoutAnything = (texts: string[], kind: MockKind): string[] =>
  kind === 'read' && texts[1] === 'expect.anything()' ? texts.slice(0, 1) : texts;

/** The request object a mock's call arguments describe; `expect.anything()` as init is dropped. */
function requestText(args: readonly ts.Expression[], kind: MockKind): string | undefined {
  const { fields, head, least } = SHAPES[kind];
  const texts = withoutAnything(
    args.map((a) => a.getText()),
    kind,
  );
  const parts = texts.map((t, i) => `${fields[i] ?? ''}: ${t}`);
  const fits = texts.length >= least && texts.length <= fields.length;
  return fits ? `{ ${[...head, ...parts].join(', ')} }` : undefined;
}

const valueText = (arg: ts.Expression | undefined): string => {
  const text = arg?.getText() ?? 'undefined';
  return arg !== undefined && ts.isObjectLiteralExpression(arg) ? `(${text})` : text;
};

type Setter = (arg: ts.Expression | undefined, kind: MockKind) => string | undefined;
const SETTERS: Readonly<Partial<Record<string, Setter>>> = {
  mockImplementation: (arg, kind) => (arg === undefined ? undefined : handlerText(arg, kind)),
  mockResolvedValue: (arg) => `() => ${valueText(arg)}`,
  mockReturnValue: (arg) => `() => ${valueText(arg)}`,
  mockRejectedValue: (arg) => `() => Promise.reject(${arg?.getText() ?? 'undefined'})`,
};

const nameOf = (call: ts.CallExpression): string =>
  narrow(call.expression, ts.isPropertyAccessExpression)?.name.text ?? '';

/** `X.mockResolvedValue(v)` and its kin as a mockCall line. */
function setterText(call: ts.CallExpression, kind: MockKind): string | undefined {
  const reset = RESETS[nameOf(call)];
  if (reset !== undefined) return `${MOCK}.${reset}('${kind}')`;
  const handler = SETTERS[nameOf(call)]?.(call.arguments[0], kind);
  return handler === undefined ? undefined : `${MOCK}.${ON[kind]}(${handler})`;
}

/** `node.method(…)`: the call a property access on `node` makes. */
function methodCall(node: ts.Node): ts.CallExpression | undefined {
  const access = narrow(node.parent, ts.isPropertyAccessExpression);
  const call = narrow(access?.parent, ts.isCallExpression);
  return access?.expression === node && call?.expression === access ? call : undefined;
}

/** `X.mockReset().mockResolvedValue(v);` as a statement: the reset, then the setter. */
function chained(call: ts.CallExpression, kind: MockKind): Use | undefined {
  const outer = methodCall(call);
  if (outer === undefined || !ts.isExpressionStatement(outer.parent)) return undefined;
  const set = RESETS[nameOf(call)] === undefined ? undefined : setterText(outer, kind);
  return set === undefined ? undefined : replace(outer, `${setterText(call, kind) ?? ''}; ${set}`);
}

/** `X.mockX(…)`, alone or after a reset. */
function setterUse(id: ts.Identifier, kind: MockKind): Use | undefined {
  const call = methodCall(id);
  if (call === undefined) return undefined;
  if (ts.isPropertyAccessExpression(call.parent)) return chained(call, kind);
  const text = setterText(call, kind);
  return text === undefined ? undefined : replace(call, text);
}

interface Matcher {
  name: string;
  not: boolean;
  call: ts.CallExpression;
}

function expectOf(id: ts.Identifier): ts.PropertyAccessExpression | undefined {
  const expectCall = narrow(id.parent, ts.isCallExpression);
  const isExpect = expectCall?.expression.getText() === 'expect';
  return isExpect ? narrow(expectCall.parent, ts.isPropertyAccessExpression) : undefined;
}

function matcherOf(id: ts.Identifier): Matcher | undefined {
  const first = expectOf(id);
  const not = first?.name.text === 'not';
  const access = not ? narrow(first.parent, ts.isPropertyAccessExpression) : first;
  const call = narrow(access?.parent, ts.isCallExpression);
  return access === undefined || call === undefined
    ? undefined
    : { name: access.name.text, not, call };
}

type MatcherText = (m: Matcher, list: string, request: string | undefined) => string | undefined;
const MATCHERS: Readonly<Partial<Record<string, MatcherText>>> = {
  toHaveBeenCalledWith: ({ not }, list, request) =>
    request && `expect(${list})${not ? '.not' : ''}.toContainEqual(${request})`,
  toHaveBeenLastCalledWith: ({ not }, list, request) =>
    not ? undefined : request && `expect(${list}.at(-1)).toEqual(${request})`,
  toHaveBeenCalled: ({ not }, list) => `expect(${list})${not ? '' : '.not'}.toHaveLength(0)`,
  toHaveBeenCalledTimes: ({ not, call }, list) => {
    const count = call.arguments[0]?.getText();
    return not ? undefined : count && `expect(${list}).toHaveLength(${count})`;
  },
};

/** `expect(X)[.not].matcher(…)`. */
function expectUse(id: ts.Identifier, kind: MockKind): Use | undefined {
  const matcher = matcherOf(id);
  if (matcher === undefined) return undefined;
  const request = requestText(matcher.call.arguments, kind);
  const text = MATCHERS[matcher.name]?.(matcher, `${MOCK}.${LIST[kind]}()`, request);
  return text === undefined ? undefined : replace(matcher.call, text);
}

/** One use of a mock rewritten for mockCall, or why the file stays. */
export function useEdit(id: ts.Identifier, kind: MockKind): Use {
  const shown = id.parent.parent.getText().slice(0, 60).replace(/\s+/g, ' ');
  return (
    setterUse(id, kind) ?? expectUse(id, kind) ?? { ok: false, refused: `${id.text}: ${shown}` }
  );
}
