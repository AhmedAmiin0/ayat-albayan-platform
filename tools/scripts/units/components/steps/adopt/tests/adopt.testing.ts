import { posix } from 'node:path';
import type { AdoptInput, AdoptVerdict } from '../adopt.types.ts';
import { adoptStep } from '../adopt-step.ts';

export const SRC = 'apps/staff-web/src';
export const MONEY = `${SRC}/features/money`;
export const DIR = `${MONEY}/MyPaymentAmount`;
export const PATH = `${DIR}/MyPaymentAmount.tsx`;
export const squash = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const EXTS = ['', '.ts', '.tsx', '/index.ts'];

/** A small repo: `@/` is the app's src, relative specs climb with `../`. */
export function fakeRepo(files: Record<string, string>) {
  const known = new Set(Object.keys(files));
  const resolve = (from: string, spec: string): string | undefined => {
    const base = spec.startsWith('@/')
      ? `${SRC}/${spec.slice(2)}`
      : posix.normalize(posix.join(posix.dirname(from), spec));
    return spec.startsWith('.') || spec.startsWith('@/')
      ? EXTS.map((e) => base + e).find((f) => known.has(f))
      : undefined;
  };
  const specFor = (from: string, file: string): string => {
    const bare = file.replace(/\.tsx?$/, '');
    const rel = posix.relative(posix.dirname(from), bare);
    if (rel.startsWith('../')) return `@/${posix.relative(SRC, bare)}`;
    return `./${rel}`;
  };
  const users = (path: string): string[] =>
    Object.keys(files).filter((f) =>
      [...(files[f] ?? '').matchAll(/from '([^']+)'/g)].some(
        (m) => resolve(f, m[1] ?? '') === path,
      ),
    );
  return { read: (p: string) => files[p] ?? '', resolve, specFor, users };
}

export function run(files: Record<string, string>, over: Partial<AdoptInput> = {}): AdoptVerdict {
  return adoptStep({
    path: PATH,
    text: files[PATH] ?? '',
    name: 'MyPaymentAmount',
    folder: ['MyPaymentAmount.tsx'],
    ...fakeRepo(files),
    ...over,
  });
}

export const adopted = (v: AdoptVerdict) => {
  if (v.result !== 'adopted') throw new Error(JSON.stringify(v));
  return v;
};

export const why = (v: AdoptVerdict): string =>
  v.result === 'refused' ? v.why : JSON.stringify(v);

export const VIEW = `import { Dialog } from '@/ui/Dialog';
import { useMyPaymentAmount } from '@/features/money/use-my-payment-amount';

export function MyPaymentAmount({ id }: { id: string }) {
  const save = useMyPaymentAmount(id);
  return <Dialog save={save} />;
}
`;

export const HOOK = `import { useMutation } from '@tanstack/react-query';
import { update } from './api';

/** PATCH needs edit rights. */
export function useMyPaymentAmount(id: string) {
  return useMutation({ mutationFn: (n: number) => update(id, n) });
}
`;

export const BASE = {
  [PATH]: VIEW,
  [`${MONEY}/use-my-payment-amount.ts`]: HOOK,
  [`${MONEY}/api.ts`]: 'export const update = () => 1;\n',
  [`${SRC}/ui/Dialog.tsx`]: 'export const Dialog = () => null;\n',
};
