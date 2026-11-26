import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HookVerdict } from '../hook.types.ts';
import { hookStep } from '../hook-step.ts';

const DIR = 'apps/family-web/src/features/x/Card';
const PATH = `${DIR}/Card.tsx`;

const run = (text: string, over: { tested?: boolean; folder?: string[] } = {}): HookVerdict =>
  hookStep({
    path: PATH,
    text,
    name: 'Card',
    folder: over.folder ?? ['Card.tsx'],
    tested: over.tested ?? true,
  });

const files = (v: HookVerdict): Record<string, string> => {
  if (v.result !== 'hooked') throw new Error(JSON.stringify(v));
  return v.files;
};

const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

test('setup moves into use-card.ts; Card.tsx keeps one call, the guards and the JSX', () => {
  const out = files(
    run(`import { useState } from 'react';
import { Row } from '@/ui/Row';
import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  const [open, setOpen] = useState(false);
  const label = props.title.trim();
  if (!open) return null;
  return <Row label={label} onPick={() => setOpen(true)} />;
}
`),
  );
  assert.equal(
    squash(out[`${DIR}/use-card.ts`]),
    squash(`import { useState } from 'react';
import type { CardProps } from './Card.types';

export function useCard(props: CardProps) {
  const [open, setOpen] = useState(false);
  const label = props.title.trim();
  return { open, setOpen, label };
}`),
  );
  assert.equal(
    squash(out[PATH]),
    squash(`import { Row } from '@/ui/Row';
import type { CardProps } from './Card.types';
import { useCard } from './use-card';

export function Card(props: CardProps) {
  const { open, setOpen, label } = useCard(props);
  if (!open) return null;
  return <Row label={label} onPick={() => setOpen(true)} />;
}`),
  );
});

test('destructured props: the hook takes the keys it reads, defaults resolved, renames by key', () => {
  const out = files(
    run(`import { useId } from 'react';
import type { CardProps } from './Card.types';

export function Card({ tz: savedTz, size = 2, title }: CardProps) {
  const id = useId();
  const zone = savedTz.toUpperCase() + size;
  return <b id={id} title={title}>{zone}</b>;
}
`),
  );
  assert.match(
    squash(out[`${DIR}/use-card.ts`]),
    /export function useCard\(\{ tz: savedTz, size \}: Pick<CardProps, 'tz'> & Required<Pick<CardProps, 'size'>>\)/,
  );
  assert.match(squash(out[PATH]), /const \{ id, zone \} = useCard\(\{ tz: savedTz, size \}\);/);
});

test('hook calls in the JSX are hoisted in source order; refs get the Ref suffix', () => {
  const out = files(
    run(`import { useRef } from 'react';
import type { CardProps } from './Card.types';

export function Card(props: CardProps) {
  const box = useRef(null);
  return <B ref={box} can={usePermissions()} tz={useViewerTz()} />;
}
`),
  );
  const hook = squash(out[`${DIR}/use-card.ts`]);
  assert.match(
    hook,
    /const boxRef = useRef\(null\); const permissions = usePermissions\(\); const viewerTz = useViewerTz\(\);/,
  );
  assert.match(hook, /return \{ boxRef, permissions, viewerTz \};/);
  assert.match(squash(out[PATH]), /<B ref=\{boxRef\} can=\{permissions\} tz=\{viewerTz\} \/>/);
});

test('useTheme stays in the view unless the setup reads it', () => {
  const kept = files(
    run(`export function Card() {
  const { colors } = useTheme();
  const [a] = useState(1);
  return <B a={a} c={colors} />;
}
`),
  );
  assert.match(
    squash(kept[PATH]),
    /const \{ colors \} = useTheme\(\); const \{ a \} = useCard\(\);/,
  );
  const moved = files(
    run(`export function Card() {
  const { colors } = useTheme();
  const [a] = useState(colors.x);
  return <B a={a} />;
}
`),
  );
  assert.doesNotMatch(squash(moved[PATH]), /useTheme/);
});

test('a component that calls no hook but useTheme gets no hook', () => {
  assert.deepEqual(
    run('export function Card() {\n  const { c } = useTheme();\n  return <b c={c} />;\n}\n'),
    {
      result: 'no-hook',
    },
  );
});
