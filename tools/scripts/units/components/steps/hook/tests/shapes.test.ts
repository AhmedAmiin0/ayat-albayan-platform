import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HookVerdict } from '../hook.types.ts';
import { hookStep } from '../hook-step.ts';

const DIR = 'apps/family-web/src/features/x/Card';
const PATH = `${DIR}/Card.tsx`;
const HOOK = `${DIR}/use-card.ts`;

const run = (text: string): HookVerdict =>
  hookStep({ path: PATH, text, name: 'Card', folder: ['Card.tsx'], tested: true });

const files = (v: HookVerdict): Record<string, string> => {
  if (v.result !== 'hooked') throw new Error(JSON.stringify(v));
  return v.files;
};

const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

test('generics: type parameters are copied; with no props input the view passes them', () => {
  const out = files(
    run(`import { useState } from 'react';
import type { CardProps } from './Card.types';

export function Card<T extends { id: string }>(props: CardProps<T>) {
  const [picked, setPicked] = useState<T | null>(null);
  return <List items={props.items} onPick={setPicked} picked={picked} />;
}
`),
  );
  assert.match(
    squash(out[HOOK]),
    /export function useCard<T extends \{ id: string \}>\(\) \{ const \[picked, setPicked\] = useState<T \| null>\(null\);/,
  );
  assert.match(squash(out[PATH]), /const \{ picked, setPicked \} = useCard<T>\(\);/);
  const withProps = files(
    run(`import { useState } from 'react';
import type { CardProps } from './Card.types';

export function Card<T>(props: CardProps<T>) {
  const [picked] = useState<T>(props.first);
  return <b>{String(picked)}</b>;
}
`),
  );
  assert.match(squash(withProps[HOOK]), /export function useCard<T>\(props: CardProps<T>\)/);
  assert.match(squash(withProps[PATH]), /const \{ picked \} = useCard\(props\);/);
});

test('a provider: the value is built in the hook and the view renders the provider', () => {
  const out = files(
    run(`import { useState } from 'react';
import { CardContext } from './card.context';
import type { CardProps } from './Card.types';

export function Card({ children }: CardProps) {
  const [open, setOpen] = useState(false);
  const value = { open, toggle: () => setOpen(!open) };
  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}
`),
  );
  assert.match(squash(out[HOOK]), /const value = \{ open, toggle: \(\) => setOpen\(!open\) \};/);
  assert.match(squash(out[HOOK]), /return \{ value \};/);
  assert.match(
    squash(out[PATH]),
    /const \{ value \} = useCard\(\);\s*return <CardContext\.Provider value=\{value\}>/,
  );
  assert.match(out[PATH] ?? '', /import \{ CardContext \} from '\.\/card\.context';/);
});

test('a render prop that returns JSX stays in the view', () => {
  const out = files(
    run(`import { useState } from 'react';
import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  const [rows] = useState(props.rows);
  return <List rows={rows} renderItem={(r) => <Row key={r.id} label={r.label} />} />;
}
`),
  );
  assert.match(
    out[PATH] ?? '',
    /renderItem=\{\(r\) => <Row key=\{r\.id\} label=\{r\.label\} \/>\}/,
  );
  assert.doesNotMatch(out[HOOK] ?? '', /renderItem/);
});

test('displayName stays in Card.tsx as its one extra top-level statement', () => {
  const out = files(
    run(`import { useState } from 'react';
import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  const [n] = useState(props.start);
  return <b>{n}</b>;
}
Card.displayName = 'Card';
`),
  );
  assert.match(out[PATH] ?? '', /\nCard\.displayName = 'Card';\n/);
  assert.doesNotMatch(out[HOOK] ?? '', /displayName/);
});
