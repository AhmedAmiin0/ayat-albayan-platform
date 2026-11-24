// The build the OTA guard (mobile.yml) compares with: the newest of the last finished EAS cloud
// build and the last runner build. `eas build:list` never sees a runner build (builder github,
// eas build --local), so that one is read from the release tag the release job puts on its commit,
// or is this run's own build (action both: the OTA runs before the release job tags it).
// Usage: APP=family PROFILE=production node native/last-build.mjs <easCommit|""> [thisRunBuild]
// Prints the commit (empty when there is none: the guard refuses then); the reason goes to stderr.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { familyTags } from '../release-tags/release-tag.mjs';

/** The tag family each mobile.yml release step writes for an app and EAS profile. */
const BUILD_TAG = {
  'family/production': { kind: 'aab', profile: 'family-production' },
  'family/preview': { kind: 'apk', profile: 'family' },
  'staff/preview': { kind: 'apk', profile: 'preview' },
  'staff/stripe-test': { kind: 'apk', profile: 'stripe-test' },
};
export const buildTagOf = (app, profile) => BUILD_TAG[`${app}/${profile}`];

/** The commit of the highest-run build tag of that app and profile ('' when there is none). */
export function lastTagged(tags, app, profile) {
  const release = buildTagOf(app, profile);
  return release ? (familyTags(tags, release).at(-1)?.sha ?? '') : '';
}

/**
 * The newest candidate by commit time (a commit missing from history ranks last); this run's own
 * build is HEAD, so nothing is newer.
 */
export function lastBuild({ eas, justBuilt = '', tags, app, profile }, timeOf) {
  if (justBuilt) return { commit: justBuilt, source: 'this run' };
  const candidates = [
    { commit: eas, source: 'EAS build list' },
    { commit: lastTagged(tags, app, profile), source: 'release tag' },
  ].filter((c) => c.commit);
  const later = (a, b) => (timeOf(b.commit) > timeOf(a.commit) ? b : a);
  const none = { commit: '', source: 'none' };
  return candidates.length ? candidates.reduce(later) : none;
}

/** `git for-each-ref` lines «name [peeled commit] object»: an annotated tag's commit first. */
export function parseTags(out) {
  return out
    .split('\n')
    .map((line) => line.split(/\s+/).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .map(([name, commit]) => ({ name, sha: commit }));
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8' });
const localTags = () =>
  parseTags(git(['for-each-ref', 'refs/tags', '--format=%(refname:strip=2) %(*objectname) %(objectname)']));
function commitTime(commit) {
  try {
    return Number(git(['show', '-s', '--format=%ct', commit]).trim());
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}

const SHA = /^([0-9a-f]{7,40})?$/;

function main() {
  const [eas = '', justBuilt = ''] = process.argv.slice(2);
  const { APP = 'staff', PROFILE = 'preview' } = process.env;
  if (!SHA.test(eas) || !SHA.test(justBuilt)) throw new Error('commits must be hex');
  const opts = { eas, justBuilt, tags: localTags(), app: APP, profile: PROFILE };
  const pick = lastBuild(opts, commitTime);
  console.error(`last ${APP} ${PROFILE} build: ${pick.commit.slice(0, 7) || 'none'} (${pick.source})`);
  console.log(pick.commit);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
