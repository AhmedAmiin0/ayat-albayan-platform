import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapperFindings } from './check.mjs';

const FILE = 'apps/api/src/modules/x/x.mapper.ts';
const HEAD = `import type { Lesson, Pay } from '@ab/shared';
import type { Row } from './x.repo';
`;
const all = (text) => new Set(text.split('\n').map((_, i) => i + 1));
const findings = (body, added) => {
  const text = HEAD + body;
  return mapperFindings({ text, file: FILE, added: added ?? all(text) });
};

test('a spread into a package type fails', () => {
  const got = findings('export function toLesson(r: Row): Lesson {\n  return { ...r, x: 1 };\n}\n');
  assert.deepEqual(got, [`${FILE}:3 toLesson returns a hand-built Lesson; wrap it in asResponse`]);
});

test('three or more k: x.k copies fail, at any depth', () => {
  const deep = '{ a: r.a, b: { c: r.c, d: r.d } }';
  const got = findings(`export const toLesson = (r: Row): Lesson => (${deep});\n`);
  assert.equal(got.length, 1);
});

test('two copies, renamed keys and asResponse pass', () => {
  const bodies = [
    'export const toLesson = (r: Row): Lesson => ({ a: r.a, b: r.b, c: r.z });\n',
    'export const toLesson = (r: Row): Lesson => asResponse(lessonSchema, { ...r });\n',
  ];
  assert.deepEqual(bodies.flatMap((b) => findings(b)), []);
});

test('promises and arrays of a package type count', () => {
  const bodies = [
    'export async function toPay(r: Row): Promise<Pay> {\n  return { ...r };\n}\n',
    'export const toPays = (r: Row): readonly Pay[] => ({ ...r });\n',
  ];
  assert.equal(bodies.flatMap((b) => findings(b)).length, 2);
});

test('local return types, unexported and non-to functions pass', () => {
  const bodies = [
    'export const toRow = (r: Row): Row => ({ ...r });\n',
    'const toLesson = (r: Row): Lesson => ({ ...r });\n',
    'export const lessonOf = (r: Row): Lesson => ({ ...r });\n',
    'export const total = (r: Row): Lesson => ({ ...r });\n',
  ];
  assert.deepEqual(bodies.flatMap((b) => findings(b)), []);
});

test('an intermediate inside the body passes; only the returned expression counts', () => {
  const body = `export function toLesson(r: Row): Lesson {
  const l = { ...r, teacher_id: 't' };
  return asResponse(lessonSchema, l);
}
`;
  assert.deepEqual(findings(body), []);
});

test('only a function whose declaration line was added is checked', () => {
  const body = 'export const toLesson = (r: Row): Lesson => ({ ...r });\n';
  assert.deepEqual(findings(body, new Set([1, 2])), []);
  assert.equal(findings(body, new Set([3])).length, 1);
});
