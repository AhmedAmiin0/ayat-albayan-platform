import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanFile } from '../declarations.mjs';

const shapeOf = (text) => scanFile('packages/shared/src/x.ts', text).declarations[0]?.shape;

test('a literal union and a z.enum with the same set share one sorted shape', () => {
  assert.equal(shapeOf("export type S = 'won' | 'new';"), 'lit:"new"|"won"');
  assert.equal(shapeOf("export const s = z.enum(['new', 'won']);"), 'lit:"new"|"won"');
  assert.equal(shapeOf('export type N = 2 | 1;'), 'lit:1|2');
});

test('an interface and an object type with the same keys and value types match', () => {
  const a = shapeOf('export interface A { name: string; id?: number }');
  const b = shapeOf('export type B = {\n  id?: number;\n  name: string;\n};');
  assert.equal(a, 'obj{id?:number;name:string}');
  assert.equal(a, b);
});

test('same names with different value types differ', () => {
  const a = shapeOf('export interface A { id: string; total: number }');
  const b = shapeOf('export interface A { id: string; total: string }');
  assert.notEqual(a, b);
});

test('a generic type keeps its parameters in the shape', () => {
  assert.equal(
    shapeOf('export type Page<T> = { items: T[]; next: string | null };'),
    'obj<T>{items:T[];next:string|null}',
  );
  assert.notEqual(
    shapeOf('export interface P<T> { items: T[]; next: string }'),
    shapeOf('export interface P { items: string[]; next: string }'),
  );
});

test('an extended interface keeps its bases', () => {
  assert.equal(
    shapeOf('export interface A extends B, C { id: string }'),
    'obj extends B,C{id:string}',
  );
});

test('a nested as const object keeps nested keys and widened value types', () => {
  const text = "export const T = { a: { b: 'x', c: -1 }, d: [1, 2], e: true } as const;";
  assert.equal(shapeOf(text), 'obj{a:{b:string;c:number};d:[number,number];e:boolean}');
});

test('as const objects with the same keys and value kinds match, whatever the values', () => {
  const a = shapeOf("export const A = { new: 'info', won: 'ok' } as const;");
  const b = shapeOf("export const B = { won: 'leads.won', new: 'leads.new' } as const;");
  assert.equal(a, b);
});

test('as const with satisfies still reads the object', () => {
  assert.equal(
    shapeOf("export const A = { a: 'x', b: 'y' } as const satisfies Record<string, string>;"),
    'obj{a:string;b:string}',
  );
});

test('a one-member set or one-key object has no shape, so it never groups by shape', () => {
  assert.equal(shapeOf("export type S = 'new';"), null);
  assert.equal(shapeOf('export interface A { id: string }'), null);
  assert.equal(shapeOf('export type Id = string;'), null);
});
