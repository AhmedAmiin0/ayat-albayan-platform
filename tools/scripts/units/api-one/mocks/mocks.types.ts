import type ts from 'typescript';
import type { TextEdit } from '../../components/model/model.types.ts';

/** A read mock stands for apiFetch, a write mock for apiSend. */
export type MockKind = 'read' | 'write';

/** A pair key backed by a local mock function (`{ apiFetch }`, `(p) => mockApiFetch(p)`). */
export interface Binding {
  type: 'local';
  local: string;
  kind: MockKind;
}

/** A factory value that answers by itself: a constant handler, or a bare mock function. */
export interface Inline {
  type: 'inline';
  key: string;
  kind: MockKind;
  handler: string | null;
}

export type Bound = Binding | Inline;

/** One rewritten use of a mock, or why the file stays. */
export type Use = { ok: true; edit: TextEdit } | { ok: false; refused: string };

/** Edits for a file, or why the file stays as it is. */
export type Plan = { ok: true; edits: TextEdit[] } | { ok: false; refused: string };

/** Where a mock is declared, and the implementation its mock function was made with. */
export interface Declared {
  name: string;
  statement: ts.VariableStatement;
  impl: ts.Expression | undefined;
}

/** `vi.mock(kit, factory)` / `jest.mock(kit, factory)` whose object names the pair. */
export interface KitMock {
  object: ts.ObjectLiteralExpression;
  pair: ts.ObjectLiteralElementLike[];
}

/** A handler a mock starts with; null when it cannot be moved. */
export interface Handler {
  kind: MockKind;
  handler: string | null;
}
