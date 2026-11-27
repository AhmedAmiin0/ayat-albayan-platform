import { kindOf, pathWithoutQuery, seenCall } from './seen-call';
import type { CallHandler, CallKind, MockCall, SeenCall } from './mock-call.types';

const keyOf = (method: string, path: string): string => `${method} ${path}`;
const methodOfKey = (key: string): string => key.split(' ', 1)[0] ?? '';
const KINDS: CallKind[] = ['read', 'write'];

/**
 * A fake call() for a test (docs/62 part 3 §3b) that runs under vitest and jest alike: set the
 * answers per method and path, read back the requests it saw. A request nothing answers resolves
 * undefined, as a bare mock function did.
 */
export function mockCall(): MockCall {
  let seen: SeenCall[] = [];
  const answers = new Map<string, unknown>();
  const handlers = new Map<CallKind, CallHandler>();

  const answerFor = (request: SeenCall): unknown => {
    const keys = [request.path, pathWithoutQuery(request.path)].map((p) =>
      keyOf(request.method, p),
    );
    const key = keys.find((k) => answers.has(k));
    return key === undefined ? handlers.get(kindOf(request))?.(request) : answers.get(key);
  };
  const see = (request: unknown): unknown => {
    const parsed = seenCall.parse(request);
    seen.push(parsed);
    return answerFor(parsed);
  };
  const call = (request: unknown): Promise<unknown> => Promise.resolve(request).then(see);
  const clear = (kind?: CallKind): void => {
    seen = kind === undefined ? [] : seen.filter((r) => kindOf(r) !== kind);
  };
  const reset = (kind?: CallKind): void => {
    clear(kind);
    const kinds = kind === undefined ? KINDS : [kind];
    kinds.forEach((k) => handlers.delete(k));
    [...answers.keys()]
      .filter((key) => kinds.includes(kindOf({ method: methodOfKey(key) })))
      .forEach((key) => answers.delete(key));
  };
  return {
    call,
    answer: (method, path, value) => answers.set(keyOf(method, path), value),
    onRead: (handler) => handlers.set('read', handler),
    onWrite: (handler) => handlers.set('write', handler),
    requests: () => [...seen],
    reads: () => seen.filter((r) => kindOf(r) === 'read'),
    writes: () => seen.filter((r) => kindOf(r) === 'write'),
    clear,
    reset,
  };
}
