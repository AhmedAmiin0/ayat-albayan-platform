// Can deploy-staging keep the running API image? Only when nothing the image depends on
// (api-inputs.ts) changed between the commit it was built from and the one being deployed.
// FAIL SAFE: an unknown commit, a failed diff or any API input in it = build, as before.
import { apiFiles } from './api-inputs.ts';

/** What «plan» knows: the last code deploy's commit and the diff since (null: git failed). */
export interface Facts {
  base: string | null;
  changed: readonly string[] | null;
}

/** keep: the image built from `base` is still right for this commit. */
export interface Decision {
  keep: boolean;
  reason: string;
}

const SHOWN = 5;
const list = (files: readonly string[]): string =>
  files.slice(0, SHOWN).join(', ') + (files.length > SHOWN ? ` (+${files.length - SHOWN})` : '');

type Say = (f: Facts, hits: readonly string[]) => Decision;

interface Rule {
  when: (f: Facts, hits: readonly string[]) => boolean;
  say: Say;
}

const unknown: Say = () => ({ keep: false, reason: 'the last code deploy is unknown' });

/** First matching rule wins; the last one always matches. */
const RULES: readonly Rule[] = [
  { when: (f) => f.base === null, say: unknown },
  {
    when: (f) => f.changed === null,
    say: (f) => ({ keep: false, reason: `git could not diff ${String(f.base)}` }),
  },
  {
    when: (_f, hits) => hits.length > 0,
    say: (_f, hits) => ({ keep: false, reason: `API inputs changed: ${list(hits)}` }),
  },
  {
    when: () => true,
    say: (f) => ({ keep: true, reason: `no API input changed since ${String(f.base)}` }),
  },
];

/** The decision for these facts against the API image inputs (api-inputs.ts apiInputs). */
export function decide(facts: Facts, inputs: readonly string[]): Decision {
  const hits = apiFiles(facts.changed ?? [], inputs);
  const say = RULES.find((r) => r.when(facts, hits))?.say ?? unknown;
  return say(facts, hits);
}
