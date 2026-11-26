import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookStep } from '../hook-step.ts';

const DIR = 'apps/family-web/src/features/x/Card';
const PATH = `${DIR}/Card.tsx`;

test('idempotent: a converted component is unchanged on a second run', () => {
  const text = `import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  const [open] = useState(props.on);
  return <b>{open}</b>;
}
`;
  const first = hookStep({ path: PATH, text, name: 'Card', folder: ['Card.tsx'], tested: true });
  if (first.result !== 'hooked') throw new Error(JSON.stringify(first));
  const out = first.files;
  const again = hookStep({
    path: PATH,
    text: out[PATH] ?? '',
    name: 'Card',
    folder: ['Card.tsx', 'use-card.ts'],
    tested: true,
  });
  assert.deepEqual(again, { result: 'done' });
});
