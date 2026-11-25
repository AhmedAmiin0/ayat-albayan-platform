// Develop skips verify and guards for a tree a green PR run already checked (ci.yml «changes»,
// step «Same tree verified on a PR?»; docs/09 «GitHub Actions»). A PR run whose verify, guards
// and refactor jobs all passed uploads the artifact ci-green-tree-<tree> (job «check»). On a
// develop push this asks GitHub for that artifact and writes verified=true to $GITHUB_OUTPUT only
// when one comes from a run of THIS repository (never a fork) and the push touches no file the
// default-branch caches are keyed on (develop keeps writing them). FAIL SAFE: anything else, an
// API or parse error = verified=false.
// Usage: git diff --name-only <before> HEAD | node verified-tree.mjs <tree>
//   env GH_TOKEN, GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_REPOSITORY_ID (and GITHUB_OUTPUT in CI)
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { httpJson } from '../../http/http-json.mjs';

export const PREFIX = 'ci-green-tree-';
const TREE = /^[0-9a-f]{40}$/;

/** The files the default-branch pnpm, vitest and jest caches are keyed on (ci.yml hashFiles). */
const CACHE_KEYS = [
  /^pnpm-lock\.yaml$/,
  /^[^/]+\/[^/]+\/(babel\.config|jest\.config|jest\.setup)\.cjs$/,
  /^packages\/config\/expo\/babel\.js$/,
  /^packages\/mobile-kit\/jest\.cjs$/,
  /^packages\/testing\/jest\.cjs$/,
  /^[^/]+\/[^/]+\/vitest\.config\.mts$/,
  /^[^/]+\/[^/]+\/vite\.config\.ts$/,
  /^packages\/config\/vite\.js$/,
  /^([^/]+\/[^/]+\/)?tsconfig[^/]*\.json$/,
];

/** GET /repos/{repo}/actions/artifacts?name=… (only the fields the decision reads). */
export const artifactList = z.object({
  artifacts: z.array(
    z.object({
      name: z.string(),
      expired: z.boolean(),
      workflow_run: z
        .object({ repository_id: z.number(), head_repository_id: z.number() })
        .nullable(),
    }),
  ),
});

const keyFiles = (files) => files.filter((f) => CACHE_KEYS.some((re) => re.test(f)));

const fromThisRepo = (repoId) => (a) =>
  a.workflow_run?.repository_id === repoId && a.workflow_run.head_repository_id === repoId;

/** { verified, reason } for `tree`, from the API's artifact list and the push's changed files. */
export function decide({ tree, repoId, files, list }) {
  const keys = keyFiles(files);
  const green = list.artifacts
    .filter((a) => a.name === `${PREFIX}${tree}` && !a.expired)
    .some(fromThisRepo(repoId));
  const why = [
    [keys.length > 0, `cache keys changed (${keys.slice(0, 3).join(', ')}): everything runs`],
    [!green, `no green PR run of tree ${tree.slice(0, 7)}: everything runs`],
  ].find(([hit]) => hit);
  return why
    ? { verified: false, reason: why[1] }
    : { verified: true, reason: `tree ${tree.slice(0, 7)} passed verify and guards on a PR` };
}

async function check(tree, files) {
  const env = process.env;
  const url = `${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/actions/artifacts`;
  const headers = { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json' };
  const list = await httpJson(
    { name: 'github', headers },
    { url: `${url}?name=${PREFIX}${tree}&per_page=100`, schema: artifactList },
  );
  return decide({ tree, repoId: Number(env.GITHUB_REPOSITORY_ID), files, list });
}

async function main(tree) {
  const files = readFileSync(0, 'utf8').split('\n').filter(Boolean);
  const result = TREE.test(tree ?? '')
    ? await check(tree, files).catch((e) => ({ verified: false, reason: `check failed: ${e}` }))
    : { verified: false, reason: 'no tree hash' };
  console.log(`::notice::verify and guards: ${result.reason}`);
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `verified=${String(result.verified)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv[2]);
