// lane-automerge: the order in which open PRs are decided. Usage: node .../queue/order.ts <file>
// <file> is the gh listing of the auto-merge and priority PRs; prints one number per line.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { listedSchema, type Listed } from '../facts.schemas.ts';
import { isPriority } from '../priority.ts';

const load = createRequire(import.meta.url);

/** Priority PRs first, then the rest in the order listed; a PR listed twice is queued once. */
export function queue(listed: Listed): number[] {
  const once = listed.filter((pr, i) => listed.findIndex((p) => p.number === pr.number) === i);
  const first = once.filter(isPriority);
  const rest = once.filter((pr) => !isPriority(pr));
  return [...first, ...rest].map((pr) => pr.number);
}

export const queueIn = (file: string): number[] => queue(listedSchema.parse(load(file)));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file = ''] = process.argv.slice(2);
  for (const n of queueIn(file)) console.log(n);
}
