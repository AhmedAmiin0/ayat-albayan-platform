import { newProject } from '../../../../move-module/rewrite.ts';
import { allowedTree } from '../../tree/names/allowed.ts';

export const W = 'apps/w';
export const F = `${W}/src/features`;
export const layer = { workspace: W, root: F, extras: [], routes: [`${W}/app`], alias: true };
const domains = [{ domain: 'finance', groups: [], features: ['expenses', 'payouts'] }];
const alias = { prefix: '@/', dir: `${W}/src`, scope: W };

export function ctx(root: string, opts: { old: Record<string, string>; forced?: string[] }) {
  return {
    project: newProject(),
    r: { root, aliases: [alias], renamed: new Map<string, string>() },
    layer,
    allowed: allowedTree(domains),
    old: 'src/[^/]+',
    oldOf: (file: string) => opts.old[file] ?? file,
    forced: new Set(opts.forced ?? []),
    open: new Set<string>(),
  };
}

export const files = {
  [`${F}/finance/expenses/index.ts`]: "export { ExpensesScreen } from './ExpensesScreen';\n",
  [`${F}/finance/expenses/ExpensesScreen.tsx`]:
    "import { Row, type RowProps } from '@/features/finance/payouts/Row';\n",
  [`${F}/finance/payouts/Row.tsx`]: 'export const Row = 1;\nexport type RowProps = {};\n',
  [`${W}/app/payouts.tsx`]: "import { Row } from '@/features/finance/payouts/Row';\n",
  [`${F}/finance/expenses/Old.tsx`]: "import { Row } from '@/features/finance/payouts/Row';\n",
};
