import assert from 'node:assert/strict';
import { test } from 'node:test';
import { run, TWO, why } from './split.testing.ts';

test('refusals: two exports, an exported extra, cap, closures, shared types, a taken folder', () => {
  const two =
    'export function Top() { return <b />; }\nexport function Card() { return <Top />; }\n';
  assert.equal(why(run(two)), 'the file exports 2+ components');
  const cap = Array.from({ length: 12 }, (_, i) => `S${i}`);
  assert.equal(why(run(TWO, { subfolders: cap })), 'Card/ would pass 12 sub-folders');
  assert.equal(why(run(TWO, { subfolders: ['Line'] })), 'Line/ already exists');
  const local = `const GAP = 2;\nfunction Line() { return <b gap={GAP} />; }
export function Card() { return <Line />; }\n`;
  assert.equal(why(run(local)), 'Line reads GAP, local to Card.tsx');
  const helper = `import { gap } from './card.helpers';\nfunction Line() { return <b gap={gap} />; }
export function Card() { return <Line />; }\n`;
  assert.equal(why(run(helper)), 'Line reads gap, local to Card.tsx');
  const sibling = `function Top() { return <b />; }\nfunction Line() { return <Top />; }
export function Card() { return <><Top /><Line /></>; }\n`;
  assert.equal(why(run(sibling)), 'Line reads Top, local to Card.tsx');
  const shared = `import type { Item } from './Card.types';
function Line(p: { it: Item }) { return <b>{p.it.id}</b>; }
export function Card(p: { it: Item }) { return <Line it={p.it} />; }\n`;
  assert.equal(why(run(shared)), 'Line shares the type Item with Card');
});
