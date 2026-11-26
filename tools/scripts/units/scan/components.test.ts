import assert from 'node:assert/strict';
import { test } from 'node:test';
import { componentUnitsIn, holdsComponent, pascalOf } from './components.ts';

const DIR = 'apps/staff-web/src/features/people';
const COMPONENTS = new Set([`${DIR}/RoleDialog.tsx`, `${DIR}/fields.tsx`, `${DIR}/Row.tsx`]);
const holds = (path: string): boolean => COMPONENTS.has(path);

test('a component file folds alone (minimum 1 file) with every Name.* file beside it', () => {
  const names = [
    'RoleDialog.tsx',
    'RoleDialog.test.tsx',
    'RoleDialog.types.ts',
    'roles.ts',
    'Row.tsx',
  ];
  const units = componentUnitsIn(DIR, names, holds);
  assert.deepEqual(
    units.map((u) => [u.name, u.files, u.tests, u.action]),
    [
      [
        'RoleDialog',
        ['RoleDialog.test.tsx', 'RoleDialog.tsx', 'RoleDialog.types.ts'],
        ['RoleDialog.test.tsx'],
        'fold',
      ],
      ['Row', ['Row.tsx'], [], 'fold'],
    ],
  );
});

test('a kebab-case component file folds with a case rename', () => {
  const units = componentUnitsIn(DIR, ['fields.tsx', 'fields.test.tsx'], holds);
  assert.deepEqual(
    units.map((u) => [u.name, u.rename]),
    [['fields', 'Fields']],
  );
  assert.equal(pascalOf('table-toolbar'), 'TableToolbar');
});

test('no fold: a file with no component, an icon set, a showcase, a unit already home', () => {
  assert.deepEqual(componentUnitsIn(DIR, ['roles.tsx', 'chat-icons.tsx'], holds), []);
  assert.deepEqual(
    componentUnitsIn(`${DIR}/Row`, ['Row.tsx', 'Row.showcase.tsx'], () => true),
    [],
  );
});

test('only the six frontend workspaces fold components', () => {
  assert.deepEqual(
    componentUnitsIn('apps/api/src/x', ['Card.tsx'], () => true),
    [],
  );
  assert.equal(componentUnitsIn('packages/mobile-kit/src/ui', ['Card.tsx'], () => true).length, 1);
});

test('holdsComponent: a top-level PascalCase function or const returning JSX', () => {
  assert.equal(holdsComponent('export function Card() {\n  return <b />;\n}\n', 'a.tsx'), true);
  assert.equal(holdsComponent('export const Card = memo(() => <b />);\n', 'a.tsx'), true);
  assert.equal(holdsComponent('export const ICONS = { a: <b /> };\n', 'a.tsx'), false);
  assert.equal(holdsComponent('export function useCard() {\n  return <b />;\n}\n', 'a.tsx'), false);
});
