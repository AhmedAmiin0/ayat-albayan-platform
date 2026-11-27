import ts from 'typescript';
import { narrow, propKey, unwrap } from '../ast.ts';
import { findAll } from '../../units/components/model/source.ts';
import { isMockFn } from './declarations.ts';
import { handlerText } from './handler.ts';
import type { Bound, Inline, KitMock, MockKind } from './mocks.types.ts';

// The kit modules a test mocks to stand in for the pair (docs/62 part 3 §3b).
const KIT_MODULE =
  /^@ab\/(?:web|mobile)-kit(?:\/lib\/http\/api(?:\/api)?)?$|(?:^|\/)http\/api$|^\.\/api$/;
const KIND_OF: Readonly<Partial<Record<string, MockKind>>> = { apiFetch: 'read', apiSend: 'write' };
const MOCKER = /^(?:vi|jest)\.mock$/;

const isMockCall = (n: ts.Node): n is ts.CallExpression =>
  ts.isCallExpression(n) && MOCKER.test(n.expression.getText());

const factoryObject = (factory: ts.Node | undefined): ts.ObjectLiteralExpression | undefined =>
  narrow(unwrap(narrow(factory, ts.isArrowFunction)?.body), ts.isObjectLiteralExpression);

const isPairKey = (p: ts.ObjectLiteralElementLike): boolean => KIND_OF[propKey(p)] !== undefined;

const kitObject = (call: ts.CallExpression): ts.ObjectLiteralExpression | undefined =>
  KIT_MODULE.test(narrow(call.arguments[0], ts.isStringLiteral)?.text ?? '')
    ? factoryObject(call.arguments[1])
    : undefined;

function kitMockOf(call: ts.CallExpression): KitMock[] {
  const object = kitObject(call);
  if (object === undefined) return [];
  const pair = object.properties.filter(isPairKey);
  return pair.length > 0 ? [{ object, pair }] : [];
}

/** The kit mocks of a test file that name apiFetch or apiSend. */
export const kitMocks = (sf: ts.SourceFile): KitMock[] =>
  findAll(sf, isMockCall).filter(isMockCall).flatMap(kitMockOf);

const argText = (a: ts.Expression): string => (ts.isSpreadElement(a) ? a.expression : a).getText();

/** `(...a) => mockX(...a)` or `(p: string) => mockX(p) as unknown`: the mock it forwards to. */
function forwardedTo(e: ts.Node | undefined): string | undefined {
  const arrow = narrow(e, ts.isArrowFunction);
  if (arrow === undefined) return undefined;
  const call = narrow(unwrap(arrow.body), ts.isCallExpression);
  const params = arrow.parameters.map((p) => p.name.getText()).join(',');
  const args = call?.arguments.map(argText).join(',');
  return args === params ? narrow(call?.expression, ts.isIdentifier)?.text : undefined;
}

function mockFnHandler(fn: ts.CallExpression, kind: MockKind): string | null | undefined {
  const [impl] = fn.arguments;
  return impl === undefined ? null : handlerText(impl, kind);
}

/** `jest.fn()` answers nothing; `jest.fn(impl)` and `() => answer` answer by themselves. */
function inlineHandler(e: ts.Node, kind: MockKind): string | null | undefined {
  if (isMockFn(e)) return mockFnHandler(e, kind);
  return ts.isArrowFunction(e) ? handlerText(e, kind) : undefined;
}

function inlineOf(value: ts.Node | undefined, key: string, kind: MockKind): Inline | undefined {
  const handler = value === undefined ? undefined : inlineHandler(value, kind);
  return handler === undefined ? undefined : { type: 'inline', key, kind, handler };
}

/** The mock behind each pair key: shorthand `{ apiFetch }`, a forwarding arrow, or inline. */
export function bindingOf(p: ts.ObjectLiteralElementLike): Bound | undefined {
  const key = propKey(p);
  const kind = KIND_OF[key];
  if (kind === undefined) return undefined;
  const value = narrow(p, ts.isPropertyAssignment)?.initializer;
  const local = narrow(p, ts.isShorthandPropertyAssignment)?.name.text ?? forwardedTo(value);
  return local === undefined ? inlineOf(value, key, kind) : { type: 'local', local, kind };
}
