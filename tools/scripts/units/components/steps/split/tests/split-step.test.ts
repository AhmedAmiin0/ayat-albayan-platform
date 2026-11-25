import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIR, files, PATH, run, squash, TWO, why } from './split.testing.ts';

test('an extra component moves to Sub/Sub.tsx with its own imports and an index', () => {
  const out = files(run(TWO));
  assert.equal(
    squash(out[`${DIR}/Line/Line.tsx`]),
    squash(`import { Row } from '@/ui/Row';

export function Line({ text }: { text: string }) {
  return <Row label={text} />;
}`),
  );
  assert.equal(squash(out[`${DIR}/Line/index.ts`]), "export { Line } from './Line';");
  const view = squash(out[PATH]);
  assert.match(view, /^import \{ Line \} from '\.\/Line';/);
  assert.doesNotMatch(view, /@\/ui\/Row|function Line/);
});

test('a file with one component is left alone', () => {
  assert.deepEqual(run('export function Card() { return <b />; }\n'), { result: 'none' });
});

test('types only the extra reads move from Name.types.ts to Sub/Sub.types.ts', () => {
  const types = `${DIR}/Card.types.ts`;
  const out = files(
    run(
      `import type { CardProps, LineProps } from './Card.types';

function Line({ text }: LineProps) {
  return <i>{text}</i>;
}

export function Card({ title }: CardProps) {
  return <Line text={title} />;
}
`,
      {
        files: {
          [types]: `import type { Id } from '@/lib/ids';

export interface CardProps {
  title: string;
}

export interface LineProps {
  text: string;
  id?: Id;
}
`,
        },
      },
    ),
  );
  assert.equal(
    squash(out[`${DIR}/Line/Line.types.ts`]),
    squash(`import type { Id } from '@/lib/ids';

export interface LineProps {
  text: string;
  id?: Id;
}`),
  );
  assert.doesNotMatch(out[types] ?? '', /LineProps|@\/lib\/ids/);
  assert.match(
    squash(out[`${DIR}/Line/Line.tsx`]),
    /import type \{ LineProps \} from '\.\/Line\.types';/,
  );
  assert.match(squash(out[PATH]), /import type \{ CardProps \} from '\.\/Card\.types';/);
});

test('a parent ../ import is re-pointed one folder up for the sub-component', () => {
  const path = 'packages/mobile-kit/src/chat/Card/Card.tsx';
  const out = files(
    run(
      `import { tone } from '../tone';

function Line() {
  return <b style={tone} />;
}

export function Card() {
  return <Line />;
}
`,
      { path },
    ),
  );
  assert.match(
    out['packages/mobile-kit/src/chat/Card/Line/Line.tsx'] ?? '',
    /from '\.\.\/\.\.\/tone'/,
  );
});

test('a sub-component with logic is split only with its hook', () => {
  const hooked = files(
    run(TWO, {
      hook: (p) => ({ result: 'hooked', files: { [p.replace('Line.tsx', 'use-line.ts')]: 'x' } }),
    }),
  );
  assert.equal(hooked[`${DIR}/Line/use-line.ts`], 'x');
  const refused = run(TWO, { hook: () => ({ result: 'refused', why: 'raw useEffect' }) });
  assert.equal(why(refused), 'Line: raw useEffect');
});

test('a second run changes nothing', () => {
  const out = files(run(TWO));
  const again = run(out[PATH] ?? '', { subfolders: ['Line'] });
  assert.deepEqual(again, { result: 'none' });
});
