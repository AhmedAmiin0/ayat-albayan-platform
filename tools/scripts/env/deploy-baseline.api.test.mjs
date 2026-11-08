import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpShapeError, HttpStatusError } from '../http/http-json.mjs';
import { deployJobPassed, githubApi, greenRuns } from './deploy-baseline.mjs';

const TOKEN = 'ghs_sentinel_token';
const env = { GITHUB_TOKEN: TOKEN, GITHUB_REPOSITORY: 'o/r', GITHUB_API_URL: 'https://gh.example' };

/** A fake fetch answering `status` with `body` (JSON); records each call. */
function fakeFetch(status, body) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, fetch };
}

const run = { id: 7, run_attempt: 2, display_title: 't', head_branch: 'develop', head_sha: 'a' };

test('greenRuns asks this repo for green develop runs with the token and reads workflow_runs', async () => {
  const f = fakeFetch(200, { total_count: 1, workflow_runs: [run] });
  const runs = await greenRuns(githubApi(env, f.fetch), 'mobile.yml');
  assert.deepEqual(runs, [run]);
  const [{ url, init }] = f.calls;
  assert.equal(
    url,
    'https://gh.example/repos/o/r/actions/workflows/mobile.yml/runs?branch=develop&status=success&per_page=100',
  );
  assert.equal(init.method, 'GET');
  assert.equal(init.headers.authorization, `Bearer ${TOKEN}`);
  assert.equal(init.headers.accept, 'application/vnd.github+json');
});

test('no workflow_runs reads as no runs, as before', async () => {
  const f = fakeFetch(200, { total_count: 0 });
  assert.deepEqual(await greenRuns(githubApi(env, f.fetch), 'mobile.yml'), []);
});

test('the API URL defaults to api.github.com', async () => {
  const f = fakeFetch(200, { workflow_runs: [] });
  await greenRuns(githubApi({ ...env, GITHUB_API_URL: '' }, f.fetch), 'x.yml');
  assert.match(f.calls[0].url, /^https:\/\/api\.github\.com\/repos\/o\/r\//);
});

test("deployJobPassed reads the run attempt's jobs: only a green «deploy» job counts", async () => {
  const jobs = (deploy) => ({ jobs: [{ name: 'plan', conclusion: 'success' }, deploy] });
  const ok = fakeFetch(200, jobs({ name: 'deploy', conclusion: 'success' }));
  assert.equal(await deployJobPassed(githubApi(env, ok.fetch), run), true);
  assert.match(ok.calls[0].url, /\/actions\/runs\/7\/attempts\/2\/jobs\?per_page=100$/);
  const skipped = fakeFetch(200, jobs({ name: 'deploy', conclusion: 'skipped' }));
  assert.equal(await deployJobPassed(githubApi(env, skipped.fetch), run), false);
  const none = fakeFetch(200, {});
  assert.equal(await deployJobPassed(githubApi(env, none.fetch), run), false);
});

test('a non-2xx throws with the status, never the token or the host', async () => {
  const f = fakeFetch(403, { message: 'Resource not accessible' });
  const err = await greenRuns(githubApi(env, f.fetch), 'mobile.yml').catch((e) => e);
  assert.ok(err instanceof HttpStatusError);
  assert.equal(err.status, 403);
  for (const secret of [TOKEN, 'gh.example', 'per_page']) {
    assert.ok(!err.message.includes(secret), secret);
  }
});

test('a 2xx of the wrong shape is an error (main then prints empty bases)', async () => {
  const f = fakeFetch(200, { workflow_runs: [{ id: 'not a number' }] });
  const err = await greenRuns(githubApi(env, f.fetch), 'mobile.yml').catch((e) => e);
  assert.ok(err instanceof HttpShapeError);
});
