import { groupBy } from '../model/group.ts';
import type { Row } from './cli.types.ts';

const wsOf = (path: string): string => path.split('/').slice(0, 2).join('/');

const totals = (rows: readonly Row[], keyOf: (r: Row) => string): string[] =>
  [...groupBy(rows, keyOf)].map(([k, list]) => `${k}\t${list.length}`).toSorted();

/** One TSV line per component and step, then totals per workspace by result and by reason. */
export function reportLines(rows: readonly Row[]): string[] {
  const refused = rows.filter((r) => r.result === 'refused');
  return [
    'path\tstep\tresult\treason',
    ...rows.map((r) => [r.path, r.step, r.result, r.reason].join('\t')),
    '',
    'workspace\tresult\tcount',
    ...totals(rows, (r) => `${wsOf(r.path)}\t${r.step}:${r.result}`),
    '',
    'workspace\treason\tcount',
    ...totals(refused, (r) => `${wsOf(r.path)}\t${r.reason.replace(/:.*$/, '')}`),
  ];
}
