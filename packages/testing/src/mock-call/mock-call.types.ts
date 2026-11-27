/** GET is a read; every other method is a write. */
export type CallKind = 'read' | 'write';

/** One request a test saw: a route-form call has its params filled and its query appended. */
export interface SeenCall {
  method: string;
  path: string;
  body?: unknown;
}

export type CallHandler = (request: SeenCall) => unknown;

/** A stand-in for a kit's call() (docs/62 part 3 §3b), with no import of the client. */
export interface MockCall {
  /** What the mocked kit module exports as `call`. */
  call: (request: unknown) => Promise<unknown>;
  /** The answer for this method and path; a path with no query also answers any query. */
  answer: (method: string, path: string, value: unknown) => void;
  /** Answers a read no `answer` matched; it may return a promise or throw. */
  onRead: (handler: CallHandler) => void;
  onWrite: (handler: CallHandler) => void;
  requests: () => SeenCall[];
  reads: () => SeenCall[];
  writes: () => SeenCall[];
  /** Forgets the requests seen, of one kind or all. */
  clear: (kind?: CallKind) => void;
  /** Forgets the requests, answers and handler, of one kind or all. */
  reset: (kind?: CallKind) => void;
}
