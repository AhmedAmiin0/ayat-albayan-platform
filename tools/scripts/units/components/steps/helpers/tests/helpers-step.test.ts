import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HelpersInput, HelpersVerdict } from '../helpers.types.ts';
import { helpersStep } from '../helpers-step.ts';

const DIR = 'apps/staff-mobile/src/x/Card';
const PATH = `${DIR}/Card.tsx`;
const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const run = (text: string, over: Partial<HelpersInput> = {}): HelpersVerdict =>
  helpersStep({ path: PATH, text, name: 'Card', files: {}, outside: [], ...over });

const files = (v: HelpersVerdict): Record<string, string> => {
  if (v.result !== 'helpers') throw new Error(JSON.stringify(v));
  return v.files;
};

test('values the view reads move with what they read; setup-only values stay for the hook step', () => {
  const out = files(
    run(`import { fmt } from '@/lib/fmt';

const UNIT = 'kg';
const label = (n: number): string => fmt(n) + UNIT;
const START = 3;

export function Card() {
  const [n] = useState(START);
  return <b>{label(n)}</b>;
}
`),
  );
  assert.equal(
    squash(out[`${DIR}/card.helpers.ts`]),
    squash(`import { fmt } from '@/lib/fmt';

export const UNIT = 'kg';

export const label = (n: number): string => fmt(n) + UNIT;`),
  );
  const view = squash(out[PATH]);
  assert.match(view, /^import \{ label \} from '\.\/card\.helpers';/);
  assert.match(view, /const START = 3;/);
  assert.doesNotMatch(view, /fmt|UNIT = /);
});

test('StyleSheet.create goes to .style.ts, cva to .variants.ts, createContext to .context.ts', () => {
  const out = files(
    run(`import { StyleSheet } from 'react-native';
import { cva } from 'class-variance-authority';
import { createContext } from 'react';

const styles = StyleSheet.create({ box: { flex: 1 } });
const tone = cva('a');
const CardContext = createContext(0);

export function Card() {
  return <CardContext.Provider value={1}><b style={styles.box} className={tone()} /></CardContext.Provider>;
}
`),
  );
  assert.match(
    squash(out[`${DIR}/card.style.ts`]),
    /import \{ StyleSheet \} from 'react-native'; export const styles = StyleSheet\.create/,
  );
  assert.match(squash(out[`${DIR}/card.variants.ts`]), /export const tone = cva\('a'\);/);
  assert.match(
    squash(out[`${DIR}/card.context.ts`]),
    /export const CardContext = createContext\(0\);/,
  );
});

test('a hook exported from the component file moves to its own use-<purpose>.ts', () => {
  const out = files(
    run(`import { useState } from 'react';

export function useCardOpen() {
  return useState(false);
}

export function Card() {
  const [open] = useCardOpen();
  return <b>{open}</b>;
}
`),
  );
  assert.match(
    squash(out[`${DIR}/use-card-open.ts`]),
    /^import \{ useState \} from 'react'; export function useCardOpen\(\)/,
  );
  assert.match(squash(out[PATH]), /^import \{ useCardOpen \} from '\.\/use-card-open';/);
});

test('tests in the folder that import a moved helper from ./Card follow it', () => {
  const out = files(
    run(
      "const UNIT = 'kg';\nexport const unitOf = (): string => UNIT;\nexport function Card() {\n  return <b>{unitOf()}</b>;\n}\n",
      {
        files: { [`${DIR}/tests/Card.test.tsx`]: "import { Card, unitOf } from '../Card';\n" },
      },
    ),
  );
  assert.equal(
    squash(out[`${DIR}/tests/Card.test.tsx`]),
    squash("import { Card } from '../Card';\nimport { unitOf } from '../card.helpers';"),
  );
});

test('refused: a helper imported by path from outside, JSX in a top-level value', () => {
  const text =
    "export const unitOf = (): string => 'kg';\nexport function Card() {\n  return <b>{unitOf()}</b>;\n}\n";
  const out = run(text, { outside: [{ file: 'apps/staff-mobile/src/y.ts', names: ['unitOf'] }] });
  assert.equal(out.result === 'refused' && out.why.includes('imported by path'), true);
  const comp = run(
    'const HEADS = { a: Head };\nexport function Card() {\n  return <b>{HEADS.a}</b>;\n}\nfunction Head() {\n  return <i />;\n}\n',
  );
  assert.equal(comp.result === 'refused' && comp.why.includes('reads a component'), true);
  const jsx = run('const ICON = <i />;\nexport function Card() {\n  return <b>{ICON}</b>;\n}\n');
  assert.equal(jsx.result === 'refused' && jsx.why.includes('JSX'), true);
});

test('nothing at the top level: none', () => {
  assert.deepEqual(run('export function Card() {\n  return <b />;\n}\n'), { result: 'none' });
});
