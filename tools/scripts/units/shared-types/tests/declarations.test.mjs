import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanFile } from '../declarations.mjs';

const PATH = 'apps/api/src/modules/sales/leads/lead.types.ts';
const scan = (text) => scanFile(PATH, text);
const rows = (text) => scan(text).declarations.map((d) => [d.name, d.kind]);

test('lists interfaces, object types, literal unions, z.enum schemas and as const objects', () => {
  const text = [
    'export interface Lead { id: string; name: string }',
    "export type Status = 'new' | 'won';",
    'export type Row = { id: string; total: number };',
    "export const leadStage = z.enum(['new', 'won']);",
    "export const TONES = { new: 'info', won: 'ok' } as const;",
    'export function helper() { return 1; }',
    'export class Repo {}',
    'export const plain = 1;',
    'const hidden = { a: 1 } as const;',
  ].join('\n');
  assert.deepEqual(rows(text), [
    ['Lead', 'interface'],
    ['Status', 'literal-union'],
    ['Row', 'type'],
    ['leadStage', 'z-enum'],
    ['TONES', 'const-object'],
  ]);
});

test('a type-only export and a local export list count; a re-export declares nothing', () => {
  const text = [
    'type Local = { a: string; b: string };',
    'interface Other { x: number; y: number }',
    'export type { Local };',
    'export { Other as Renamed };',
    "export type { Lead } from './lead';",
    "export * from './stage';",
  ].join('\n');
  assert.deepEqual(rows(text), [
    ['Local', 'type'],
    ['Renamed', 'interface'],
  ]);
});

test('a re-export imports its names from the target workspace', () => {
  const { imports } = scan("export type { Lead } from '@ab/shared';\nexport { Other } from './x';");
  assert.deepEqual(imports, [
    { name: 'Lead', target: 'packages/shared' },
    { name: 'Other', target: 'apps/api' },
  ]);
});

test('imports keep the imported name, type-only included; namespaces and packages out', () => {
  const text = [
    "import type { Lead as L } from '@ab/shared';",
    "import { z } from 'zod';",
    "import { type Stage, stage } from '@/modules/sales';",
    "import * as all from '@ab/core';",
    "import Default from './default';",
  ].join('\n');
  assert.deepEqual(scan(text).imports, [
    { name: 'Lead', target: 'packages/shared' },
    { name: 'Stage', target: 'apps/api' },
    { name: 'stage', target: 'apps/api' },
    { name: 'default', target: 'apps/api' },
  ]);
});

test('a default export: an interface keeps its name, an as const object is «default»', () => {
  assert.deepEqual(rows('export default interface Lead { a: string; b: string }'), [
    ['Lead', 'interface'],
  ]);
  assert.deepEqual(rows("export default { a: 'x', b: 'y' } as const;"), [
    ['default', 'const-object'],
  ]);
});

test('a z.enum over a local as const tuple reads the tuple', () => {
  const text = "const STAGES = ['new', 'won'] as const;\nexport const stage = z.enum(STAGES);";
  const [row] = scan(text).declarations;
  assert.equal(row.kind, 'z-enum');
  assert.equal(row.shape, 'lit:"new"|"won"');
});

test('a z.infer type is wire data; a plain type is not', () => {
  const text = 'export type Lead = z.infer<typeof lead>;\nexport type Id = string;';
  assert.deepEqual(
    scan(text).declarations.map((d) => [d.name, d.wire]),
    [
      ['Lead', true],
      ['Id', false],
    ],
  );
});

test('a file that does not parse reports its error and lists nothing', () => {
  const result = scan('export interface Lead { id: string');
  assert.deepEqual(result.declarations, []);
  assert.match(result.error ?? '', /expected/i);
});

test('each declaration carries its path, workspace and line', () => {
  const [row] = scan('\n\nexport type Status = 1 | 2;').declarations;
  assert.deepEqual([row.path, row.ws, row.line], [PATH, 'apps/api', 3]);
});
