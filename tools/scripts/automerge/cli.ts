// lane-automerge: what to do with one PR. Usage: node tools/scripts/automerge/cli.ts <dir>
// <dir> holds what the workflow gathered with gh and git: pr, checks, status, annotations, files,
// behind, comments, events and suites (.json). Prints action=merge|comment|skip, sha= and
// reason= for $GITHUB_OUTPUT and writes subject.txt and body.txt (merge) or comment.txt (comment).
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubBody, subjectOf } from './body.ts';
import { decide } from './decide.ts';
import { combinedStatusSchema, factsSchema, type Facts } from './facts.schemas.ts';
import { staleComment } from './lockfile.ts';

const NAMES = [
  'pr',
  'checks',
  'annotations',
  'files',
  'behind',
  'comments',
  'events',
  'suites',
] as const;

// Node's own JSON loader (no hand JSON.parse, docs/36 Z-2); zod checks what it read.
const load = createRequire(import.meta.url);

function factsIn(dir: string): Facts {
  const read = (name: string): unknown => load(join(dir, `${name}.json`));
  const raw = Object.fromEntries(NAMES.map((name) => [name, read(name)]));
  const { statuses } = combinedStatusSchema.parse(read('status'));
  return factsSchema.parse({ ...raw, statuses });
}

/** The $GITHUB_OUTPUT lines for the PR gathered in `dir`. */
export function run(dir: string): string[] {
  const facts = factsIn(dir);
  const { action, reason } = decide(facts);
  const write = (name: string, text: string): void => {
    writeFileSync(join(dir, name), text);
  };
  write('subject.txt', subjectOf(facts.pr));
  write('body.txt', scrubBody(facts.pr.body));
  write('comment.txt', staleComment(facts.pr.headRefOid));
  return [`action=${action}`, `sha=${facts.pr.headRefOid}`, `reason=${reason.replace(/\n/g, ' ')}`];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir = ''] = process.argv.slice(2);
  for (const line of run(dir)) console.log(line);
}
