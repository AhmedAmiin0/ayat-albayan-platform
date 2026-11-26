import type { SplitInput, SplitVerdict } from '../split.types.ts';
import { splitStep } from '../split-step.ts';

export const DIR = 'apps/family-web/src/features/x/Card';
export const PATH = `${DIR}/Card.tsx`;
export const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

export const run = (text: string, over: Partial<SplitInput> = {}): SplitVerdict =>
  splitStep({
    path: PATH,
    text,
    name: 'Card',
    files: {},
    subfolders: [],
    hook: () => ({ result: 'no-hook' }),
    ...over,
  });

export const files = (v: SplitVerdict): Record<string, string> => {
  if (v.result !== 'split') throw new Error(JSON.stringify(v));
  return v.files;
};

export const why = (v: SplitVerdict): string =>
  v.result === 'refused' ? v.why : JSON.stringify(v);

export const TWO = `import { Row } from '@/ui/Row';

function Line({ text }: { text: string }) {
  return <Row label={text} />;
}

export function Card() {
  return <Line text="a" />;
}
`;
