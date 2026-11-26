import { noTypedValueTableRule } from './eslint-value-table.js';
import { testRule } from './rule-testers.js';

const typed = { messageId: 'typed' };

testRule({ name: 'no-typed-value-table', rule: noTypedValueTableRule, lang: 'ts' }, {
  valid: [
    // A decoded zod record: no hand-written Record.
    "const T = z.record(a, b).readonly().decode({ x: 'y' });",
    // DB-name tables keep `as const satisfies`.
    "const T = { a: 'lessons' } as const satisfies Record<Kind, TableName>;",
    // Both sides primitive.
    "const T: Record<string, number> = { a: 1 };",
    "const T: Readonly<Record<string, string>> = { a: 'x' };",
    "const T = { a: true } satisfies Record<string, boolean>;",
    // Values that are not literals: handler maps, constants, schemas.
    "const T: Record<Kind, Handler> = { a: () => 1 };",
    "const T: Record<Kind, string> = { a: CONST };",
    "const T: Record<Kind, Schema> = { a: z.string() };",
    "const T: Record<Kind, string> = { a: `x${y}` };",
    // Not a Record type.
    "const T: Labels = { a: 'x' };",
    "const T: Map<Kind, string> = new Map();",
    // `let` is not a table.
    "let T: Record<Kind, string> = { a: 'x' };",
    // An empty object holds no values.
    'const T: Record<Kind, string> = {};',
  ],
  invalid: [
    { code: "const T: Record<Kind, Other> = { a: 'x', b: 'y' };", errors: [typed] },
    { code: "const T: Record<Kind, string> = { a: 'x' };", errors: [typed] },
    { code: "const T: Record<string, Kind | null> = { a: 'x', b: null };", errors: [typed] },
    { code: 'const T: Partial<Record<Kind, number>> = { a: 1, b: -1 };', errors: [typed] },
    { code: 'const T: Readonly<Record<Kind, boolean>> = { a: true };', errors: [typed] },
    { code: "const T: Record<Kind, string> = { a: 'x' } as const;", errors: [typed] },
    { code: "const T = { a: 'x' } satisfies Record<Kind, Other>;", errors: [typed] },
    { code: "export const T: Record<Kind, Other> = { 'a-b': 'x', 1: 'y' };", errors: [typed] },
  ],
});
