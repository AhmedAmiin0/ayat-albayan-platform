import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foldersOf } from '../../tree/files/folders.ts';
import { rewriteLintPaths } from '../lint/lint-paths.ts';

const W = 'apps/m';
const before = [
  `${W}/src/inbox/send-file.ts`,
  `${W}/src/core/http/a.ts`,
  `${W}/src/mix/a.ts`,
  `${W}/src/mix/b.ts`,
];
const moves = {
  files: new Map([
    [`${W}/src/inbox/send-file.ts`, `${W}/src/features/messaging/inbox/send-file.ts`],
    [`${W}/src/mix/a.ts`, `${W}/src/features/x/a.ts`],
    [`${W}/src/mix/b.ts`, `${W}/src/features/y/b.ts`],
  ]),
  before: new Set(before),
  folders: foldersOf(before),
};

test('file paths and folder globs follow the moves; untouched ones stay', () => {
  const text = "['src/inbox/send-file.ts', 'src/core/http/**', 'src/**/*.ts']";
  const out = rewriteLintPaths(text, { workspace: W, moves });
  assert.equal(
    out.text,
    "['src/features/messaging/inbox/send-file.ts', 'src/core/http/**', 'src/**/*.ts']",
  );
  assert.deepEqual(out.stale, []);
});

test('a glob over a folder whose files split up is stale', () => {
  const out = rewriteLintPaths("['src/mix/**']", { workspace: W, moves });
  assert.deepEqual(out.stale, [`${W}: src/mix/**`]);
});
