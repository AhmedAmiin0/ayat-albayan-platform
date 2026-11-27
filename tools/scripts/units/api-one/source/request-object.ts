import ts from 'typescript';
import { narrow, propKey } from '../ast.ts';
import { sendArgOf } from './send-arg.ts';
import type { Built } from './source.types.ts';

const FETCH_KEYS = new Set(['schema', 'signal', 'headers', 'method']);

type Parts = { kind: 'parts'; parts: string[] } | { kind: 'refused'; reason: string };

const parts = (list: string[]): Parts => ({ kind: 'parts', parts: list });
const refusedParts = (reason: string): Parts => ({ kind: 'refused', reason });
const refused = (reason: string): Built => ({ kind: 'refused', reason });

const entry = (key: string, value: ts.Expression): string => {
  const text = value.getText();
  return text === key ? key : `${key}: ${text}`;
};

const objectOf = (head: string[], tail: Parts): Built =>
  tail.kind === 'parts'
    ? { kind: 'text', text: `{ ${[...head, ...tail.parts].join(', ')} }` }
    : refused(tail.reason);

const NO_PROPS: readonly ts.ObjectLiteralElementLike[] = [];

/** apiFetch's init: only schema, signal, headers and method carry over (a raw body does not). */
function initParts(init: ts.Expression | undefined): Parts {
  const literal = narrow(init, ts.isObjectLiteralExpression);
  const props = init === undefined ? NO_PROPS : literal?.properties;
  if (props === undefined) return refusedParts('init is not an object literal');
  const odd = props.map(propKey).find((k) => !FETCH_KEYS.has(k));
  return odd === undefined ? parts(props.map((p) => p.getText())) : refusedParts(`init key ${odd}`);
}

/** apiFetch(path, init?) → `{ path, …init }`. */
export function fetchObject(args: readonly ts.Expression[]): Built {
  const [path, init, ...extra] = args;
  if (path === undefined || extra.length > 0) return refused('unexpected arguments');
  return objectOf([entry('path', path)], initParts(init));
}

/** The options spread as they are: their own keys, or the variable that holds them. */
const optionParts = (arg: ts.Expression): string[] => {
  const literal = narrow(arg, ts.isObjectLiteralExpression);
  return literal === undefined
    ? [`...${arg.getText()}`]
    : literal.properties.map((p) => p.getText());
};

function sendTail(arg: ts.Expression | undefined): Parts {
  if (arg === undefined) return parts([]);
  const tails: Record<ReturnType<typeof sendArgOf>, () => Parts> = {
    body: () => parts([entry('body', arg)]),
    options: () => parts(optionParts(arg)),
    undecided: () => refusedParts('body or { body, schema } is undecided'),
  };
  return tails[sendArgOf(arg)]();
}

/** apiSend(method, path, body | { body, schema }?) → `{ method, path, body, schema }`. */
export function sendObject(args: readonly ts.Expression[]): Built {
  const [method, path, arg, ...extra] = args;
  if (method === undefined || path === undefined || extra.length > 0) {
    return refused('unexpected arguments');
  }
  return objectOf([entry('method', method), entry('path', path)], sendTail(arg));
}
