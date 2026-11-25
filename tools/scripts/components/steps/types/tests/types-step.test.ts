import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TypesInput, TypesVerdict } from '../types.types.ts';
import { typesStep } from '../types-step.ts';

const DIR = 'apps/family-web/src/features/x/Card';
const PATH = `${DIR}/Card.tsx`;
const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const run = (text: string, over: Partial<TypesInput> = {}): TypesVerdict =>
  typesStep({ path: PATH, text, name: 'Card', files: {}, outside: [], ...over });

const files = (v: TypesVerdict): Record<string, string> => {
  assert.equal(v.result, 'typed', JSON.stringify(v));
  return v.result === 'typed' ? v.files : {};
};

test('types move to Card.types.ts, `type X = {…}` becomes an interface, Card.tsx imports them', () => {
  const out = files(
    run(`import type { Tz } from '@ab/time';

type Mode = 'a' | 'b';
export type CardProps = { tz: Tz; mode: Mode };

export function Card(props: CardProps) {
  return <b>{props.mode}</b>;
}
`),
  );
  assert.equal(
    squash(out[`${DIR}/Card.types.ts`]),
    squash(`import type { Tz } from '@ab/time';

export type Mode = 'a' | 'b';

export interface CardProps { tz: Tz; mode: Mode }`),
  );
  assert.equal(
    squash(out[PATH]),
    squash(`import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  return <b>{props.mode}</b>;
}`),
  );
});

test('an inline parameter type becomes CardProps', () => {
  const out = files(run('export function Card({ a }: { a: number }) {\n  return <b>{a}</b>;\n}\n'));
  assert.match(squash(out[`${DIR}/Card.types.ts`]), /export interface CardProps \{ a: number \}/);
  assert.match(squash(out[PATH]), /export function Card\(\{ a \}: CardProps\)/);
});

test('a props type from a package becomes an alias in Card.types.ts', () => {
  const out = files(
    run(
      "import type { CellProps } from '@ab/web-kit';\n\nexport function Card(p: CellProps<Row>) {\n  return <b />;\n}\n",
      {
        files: { [`${DIR}/Card.types.ts`]: 'export interface Row { id: string }\n' },
      },
    ),
  );
  assert.match(squash(out[`${DIR}/Card.types.ts`]), /export type CardProps = CellProps<Row>;/);
  assert.match(squash(out[PATH]), /import type \{ CardProps \} from '.\/Card.types';/);
});

test('existing Card.types.ts keeps its text; the index re-exports moved types from it', () => {
  const out = files(
    run(
      'export interface CardProps { a: number }\nexport function Card(p: CardProps) {\n  return <b />;\n}\n',
      {
        files: {
          [`${DIR}/Card.types.ts`]: 'export type Size = 1;\n',
          [`${DIR}/index.ts`]: "export { Card, type CardProps } from './Card';\n",
        },
      },
    ),
  );
  assert.match(
    squash(out[`${DIR}/Card.types.ts`]),
    /^export type Size = 1; export interface CardProps/,
  );
  assert.equal(
    squash(out[`${DIR}/index.ts`]),
    squash("export { Card } from './Card';\nexport type { CardProps } from './Card.types';"),
  );
});

test('refused: a type outside code imports from Card.tsx by path, a type that reads a value', () => {
  const text =
    'export interface CardProps { a: number }\nexport function Card(p: CardProps) {\n  return <b />;\n}\n';
  const v = run(text, { outside: [{ file: 'apps/family-web/src/y.ts', names: ['CardProps'] }] });
  assert.equal(v.result === 'refused' && /imported by path/.test(v.why), true);
  const reads = run(
    'const SIZES = [1];\ntype Size = (typeof SIZES)[number];\nexport function Card(p: { s: Size }) {\n  return <b />;\n}\n',
  );
  assert.equal(reads.result === 'refused' && /reads a value/.test(reads.why), true);
});

test('nothing to move: none', () => {
  assert.deepEqual(
    run(
      "import type { CardProps } from './Card.types';\nexport function Card(p: CardProps) {\n  return <b />;\n}\n",
    ),
    {
      result: 'none',
    },
  );
});
