import { groupBy } from '../../units/components/model/group.ts';
import type { Row } from './cli.types.ts';

const wsOf = (path: string): string => path.split('/').slice(0, 2).join('/');
const count = (rows: readonly Row[], kind: Row['kind'], result: Row['result']): number =>
  rows.filter((r) => r.kind === kind && r.result === result).length;

/** Per workspace: calls and test files rewritten and left; then every left one with its reason. */
export function reportLines(rows: readonly Row[]): string[] {
  const totals = [...groupBy(rows, (r) => wsOf(r.path))]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([ws, list]) =>
      [
        ws,
        count(list, 'call', 'rewritten'),
        count(list, 'call', 'left'),
        count(list, 'test', 'rewritten'),
        count(list, 'test', 'left'),
        new Set(list.filter((r) => r.result === 'excluded').map((r) => r.path)).size,
      ].join('\t'),
    );
  const left = rows
    .filter((r) => r.result !== 'rewritten')
    .map((r) => `${r.path}:${r.line}\t${r.kind}\t${r.result}\t${r.reason}`);
  return [
    'workspace\tcalls rewritten\tcalls left\ttests rewritten\ttests left\tfiles excluded',
    ...totals,
    '',
    'path:line\tkind\tresult\treason',
    ...left,
  ];
}
