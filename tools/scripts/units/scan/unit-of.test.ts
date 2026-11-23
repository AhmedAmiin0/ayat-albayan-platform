import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unitOf, unitsOf } from './unit-of.ts';

const FOLDER = [
  'env.ts',
  'env.blank.ts',
  'ThreadPane.tsx',
  'ThreadPane.types.ts',
  'ThreadPaneWide.tsx',
  'Card.props.ts',
  'Card.styles.ts',
  'index.ts',
];
const STEMS = [
  'env',
  'env.blank',
  'ThreadPane',
  'ThreadPane.types',
  'ThreadPaneWide',
  'Card.props',
];

const CASES: [string, string | undefined][] = [
  ['env.ts', 'env'],
  ['env.test.ts', 'env'],
  ['env.blank.ts', 'env.blank'],
  ['env.blank.test.ts', 'env.blank'],
  ['ThreadPane.tsx', 'ThreadPane'],
  ['ThreadPane.chat.test.tsx', 'ThreadPane'],
  ['ThreadPane.types.ts', 'ThreadPane'],
  ['ThreadPane.types.test.ts', 'ThreadPane'],
  ['ThreadPaneWide.tsx', 'ThreadPaneWide'],
  ['ThreadPaneWide.test.tsx', 'ThreadPaneWide'],
  ['Card.props.ts', 'Card'],
  ['orphan.test.ts', undefined],
];

test('a file belongs to the longest stem it extends; a role file to its owner', () => {
  for (const [name, unit] of CASES) assert.equal(unitOf(name, STEMS), unit, name);
});

test('unitsOf groups a folder: role files join their owner, index.ts and orphans stay out', () => {
  const units = unitsOf([...FOLDER, 'env.blank.test.ts', 'ThreadPane.chat.test.tsx', 'x.test.ts']);
  assert.deepEqual(Object.fromEntries(units), {
    env: ['env.ts'],
    'env.blank': ['env.blank.test.ts', 'env.blank.ts'],
    ThreadPane: ['ThreadPane.chat.test.tsx', 'ThreadPane.tsx', 'ThreadPane.types.ts'],
    ThreadPaneWide: ['ThreadPaneWide.tsx'],
    Card: ['Card.props.ts', 'Card.styles.ts'],
  });
});

test('every role of the table attaches to its owner', () => {
  const roles = ['props', 'types', 'styles', 'schemas', 'mapper', 'fakes', 'fixtures'];
  const more = ['constants', 'hooks', 'builder', 'variants'];
  for (const role of [...roles, ...more]) assert.equal(unitOf(`X.${role}.ts`, [`X.${role}`]), 'X');
  assert.equal(unitOf('X.service.ts', ['X.service']), 'X.service');
});

test('declaration, generated and non-code files are no unit', () => {
  assert.deepEqual([...unitsOf(['a.d.ts', 'routeTree.gen.ts', 'a.css', 'a.json']).keys()], []);
});
