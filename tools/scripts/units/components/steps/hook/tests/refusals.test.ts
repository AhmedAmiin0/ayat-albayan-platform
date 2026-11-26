import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookStep } from '../hook-step.ts';

const PATH = 'apps/family-web/src/features/x/Card/Card.tsx';
const why = (text: string, over: { tested?: boolean; folder?: string[] } = {}): string => {
  const v = hookStep({
    path: PATH,
    text,
    name: 'Card',
    folder: over.folder ?? ['Card.tsx'],
    tested: over.tested ?? true,
  });
  return v.result === 'refused' ? v.why : `not refused: ${v.result}`;
};
const body = (lines: string): string => `export function Card(props: CardProps) {\n${lines}\n}\n`;

const CASES: [string, string, RegExp][] = [
  [
    'narrowing after guard',
    body(
      '  const [a] = useState(1);\n  if (!a) return null;\n  const b = a;\n  return <b>{b}</b>;',
    ),
    /narrowing after guard/,
  ],
  ['useMemo', body('  const a = useMemo(() => 1, []);\n  return <b>{a}</b>;'), /useMemo/],
  [
    'raw effect',
    body('  useEffect(() => {}, []);\n  const [a] = useState(1);\n  return <b>{a}</b>;'),
    /raw useEffect/,
  ],
  [
    'apiFetch',
    body('  const q = useQuery({ queryFn: () => apiFetch("/x") });\n  return <b>{q.data}</b>;'),
    /apiFetch/,
  ],
  [
    'JSX const',
    body('  const [a] = useState(1);\n  const el = <i>{a}</i>;\n  return <b>{el}</b>;'),
    /JSX const/,
  ],
  [
    '.current in JSX',
    body('  const box = useRef(1);\n  return <b>{box.current}</b>;'),
    /\.current/,
  ],
  ['hook in a branch', body('  return <b>{props.on ? useA() : null}</b>;'), /branch/],
  [
    'hook in JSX while guards exist',
    body('  if (!props.on) return null;\n  return <b a={useA()} />;'),
    /guards exist/,
  ],
  [
    'rest element',
    'export function Card({ a, ...rest }: CardProps) {\n  const [x] = useState(rest.b);\n  return <b>{x}</b>;\n}\n',
    /rest element/,
  ],
  [
    'inline props type',
    'export function Card(props: { a: number }) {\n  const [x] = useState(props.a);\n  return <b>{x}</b>;\n}\n',
    /inline props type/,
  ],
  [
    'memo wrapper',
    'export const Card = memo(function Card() {\n  const [x] = useState(1);\n  return <b>{x}</b>;\n});\n',
    /forwardRef or memo/,
  ],
  [
    'hook defined in the file',
    `function useLocal() {\n  return 1;\n}\n${body('  const a = useLocal();\n  return <b>{a}</b>;')}`,
    /hook defined in the file/,
  ],
  [
    'two components',
    `${body('  const [a] = useState(1);\n  return <b>{a}</b>;')}export function Other() {\n  return <i />;\n}\n`,
    /several components/,
  ],
  [
    'types in the file',
    `interface Local { a: 1 }\n${body('  const [a] = useState(1);\n  return <b>{a}</b>;')}`,
    /types step first/,
  ],
  [
    'helpers the JSX reads',
    `const LIMIT = 3;\n${body('  const [a] = useState(LIMIT);\n  return <b n={LIMIT}>{a}</b>;')}`,
    /helpers step first/,
  ],
];

test('every refusal reason leaves the component alone', () => {
  for (const [label, text, reason] of CASES) assert.match(why(text), reason, label);
});

test('an untested component, and a same-name hook, are refused', () => {
  const text = body('  const [a] = useState(1);\n  return <b>{a}</b>;');
  assert.match(why(text, { tested: false }), /untested/);
  assert.match(why(text, { folder: ['Card.tsx', 'use-card.ts'] }), /same-name hook/);
  assert.match(
    why(
      `import { useCard } from '@/x/use-card';\n${body('  const a = useCard();\n  return <b>{a}</b>;')}`,
    ),
    /same-name hook/,
  );
});

test('top-level values only the setup reads move into the hook, unexported', () => {
  const v = hookStep({
    path: PATH,
    text: `const START = 3;\n${body('  const [a] = useState(START);\n  return <b>{a}</b>;')}`,
    name: 'Card',
    folder: ['Card.tsx'],
    tested: true,
  });
  if (v.result !== 'hooked') throw new Error(JSON.stringify(v));
  assert.match(
    v.files['apps/family-web/src/features/x/Card/use-card.ts'] ?? '',
    /^const START = 3;$/m,
  );
  assert.doesNotMatch(v.files[PATH] ?? '', /START = 3/);
});
