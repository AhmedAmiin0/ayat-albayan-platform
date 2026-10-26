// What did staging last receive? Used by deploy-staging.yml «plan» (GitHub API, actions: read, no secret).
//   migrate_base  the newest green deploy-staging run whose «deploy» job passed and that did not skip
//                 migrations: run-name «deploy-staging <sha>» with no marker (a marker = env-only / no-migrate)
//   code_base     the newest green deploy-staging run that shipped code (no «env-only» marker)
//   ota_base      the commit of the newest green mobile run that shipped an OTA to preview
//                 (run-name «mobile ota-update preview» / «mobile both preview»); empty if none is known
// An empty value means «unknown»: the workflow then fails safe (the gated migrate job runs; no OTA).
// Usage: GITHUB_TOKEN=… GITHUB_REPOSITORY=o/r node tools/scripts/deploy-baseline.mjs   → key=value lines
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;

/** «deploy-staging <sha>[ env-only| no-migrate]» → { sha, marker }; anything else (old runs) → null. */
export function parseDeployTitle(title) {
  const m = /^deploy-staging ([0-9a-f]{40})(?: (env-only|no-migrate))?$/.exec(String(title ?? ''));
  return m ? { sha: m[1], marker: m[2] ?? '' } : null;
}

const onDevelop = (run) => run.head_branch === 'develop' && run.conclusion === 'success';

/**
 * Newest first. `deployed(run)` says whether the run's «deploy» job passed (a green run can have
 * skipped it, e.g. no SSH key yet). Old runs without a sha in their title are never trusted.
 */
export async function pickDeployBases(runs, deployed) {
  const out = { migrate_base: '', code_base: '' };
  for (const run of runs) {
    if (out.migrate_base && out.code_base) break;
    const t = parseDeployTitle(run.display_title);
    if (!onDevelop(run) || !t || t.marker === 'env-only') continue;
    if (!(await deployed(run))) continue;
    if (!out.code_base) out.code_base = t.sha;
    if (!out.migrate_base && t.marker === '') out.migrate_base = t.sha;
  }
  return out;
}

/** The commit the newest green preview OTA was built from (a dispatch run's head_sha is that commit). */
export function pickOtaBase(runs) {
  const run = runs.find(
    (r) => onDevelop(r) && /^mobile (ota-update|both) preview$/.test(String(r.display_title)),
  );
  return run && SHA.test(run.head_sha) ? run.head_sha : '';
}

async function api(path) {
  const base = process.env['GITHUB_API_URL'] || 'https://api.github.com';
  const res = await fetch(`${base}/repos/${process.env['GITHUB_REPOSITORY']}${path}`, {
    headers: {
      authorization: `Bearer ${process.env['GITHUB_TOKEN']}`,
      accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status}`);
  return res.json();
}

const greenRuns = async (file) =>
  (await api(`/actions/workflows/${file}/runs?branch=develop&status=success&per_page=100`))
    .workflow_runs ?? [];

async function deployJobPassed(run) {
  const { jobs = [] } = await api(
    `/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
  );
  return jobs.some((j) => j.name === 'deploy' && j.conclusion === 'success');
}

async function main() {
  const out = await pickDeployBases(await greenRuns('deploy-staging.yml'), deployJobPassed);
  out.ota_base = pickOtaBase(await greenRuns('mobile.yml'));
  for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    // Unknown, not wrong: every value stays empty and the workflow takes the safe path.
    console.error(`::warning::deploy baseline unknown: ${e.message}`);
    console.log('migrate_base=\ncode_base=\nota_base=');
  });
}
