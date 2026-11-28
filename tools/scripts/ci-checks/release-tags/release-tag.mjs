// Release tags (docs/09 «Release tags»): one git tag + one GitHub Release per shipped release, made
// by the «release» jobs of deploy-staging.yml (KIND=app) and mobile.yml (KIND=apk / ota) with the
// run's GITHUB_TOKEN (tags it makes start no workflow, so nothing loops).
//   app  v<YYYY.MM.DD>-<n>                the web + API deploy (UTC day; n = day's highest + 1)
//   apk  mobile-v<version>-b<run number>  an EAS Android build (other profile: mobile-<profile>-v…)
//   aab  aab-<profile>-v<version>-b<run>   a Google Play bundle (mobile.yml family production)
//   ota  ota-<channel>-<YYYY.MM.DD>-<n>   an EAS update to that channel
// A commit that already carries a tag of the family is skipped (re-runs never duplicate). The notes
// are GitHub's generated notes since the family's previous tag. Any failure only warns: the run
// stays green (deploy-baseline.mjs reads green runs) and a tag is a label, never part of the
// release. Usage: GH_TOKEN=… GH_REPO=o/r KIND=app SHA=<40 hex> node
// tools/scripts/ci-checks/release-tags/release-tag.mjs
//   apk and aab also need PROFILE, VERSION, GITHUB_RUN_NUMBER (EAS_URL, or ARTIFACT_URL and SHA256
//   for a runner build, optional); ota needs CHANNEL.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { about, readLinks } from './release-notes.mjs';

const NAME = /^[a-z][a-z0-9-]{0,30}$/;
const BUILD = { PROFILE: NAME, VERSION: /^\d+\.\d+\.\d+$/, GITHUB_RUN_NUMBER: /^\d+$/ };
const RULES = { app: {}, apk: BUILD, aab: BUILD, ota: { CHANNEL: NAME } };

/** The release the env describes, checked: its values end up in a tag name. */
export function readRelease(env) {
  if (!Object.hasOwn(RULES, env.KIND ?? '')) throw new Error('KIND must be app, apk, aab or ota');
  for (const [key, re] of Object.entries({ SHA: /^[0-9a-f]{40}$/, ...RULES[env.KIND] })) {
    if (!re.test(env[key] ?? '')) throw new Error(`${key} is missing or malformed`);
  }
  return {
    kind: env.KIND,
    sha: env.SHA,
    profile: env.PROFILE,
    version: env.VERSION,
    run: env.GITHUB_RUN_NUMBER,
    channel: env.CHANNEL,
    ...readLinks(env),
  };
}

const apkPrefix = (r) => (r.profile === 'preview' ? 'mobile-v' : `mobile-${r.profile}-v`);
/** The fixed start of a family's tags: an AAB's «aab-» never starts like an APK's «mobile-». */
const PREFIX = {
  app: () => 'v',
  apk: apkPrefix,
  aab: (r) => `aab-${r.profile}-v`,
  ota: (r) => `ota-${r.channel}-`,
};
const prefix = (release) => PREFIX[release.kind](release);
/** APK and AAB tags carry the version and run number; the others a UTC day and a counter. */
const isBuild = (release) => ['apk', 'aab'].includes(release.kind);

const DAY = String.raw`(?<day>\d{4}\.\d{2}\.\d{2})-(?<n>\d+)`;
const APK = String.raw`\d+\.\d+\.\d+-b(?<n>\d+)`;

function older(a, b) {
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return a.n - b.n;
}

/** The family's tags, oldest first: `{ name, sha, day, n }` (builds: no day, n = run number). */
export function familyTags(tags, release) {
  const re = new RegExp(`^${prefix(release)}${isBuild(release) ? APK : DAY}$`);
  return tags
    .flatMap(({ name, sha }) => {
      const g = re.exec(name)?.groups;
      return g ? [{ name, sha, day: g.day ?? '', n: Number(g.n) }] : [];
    })
    .sort(older);
}

/** `{ skip }` when the commit already carries a tag of the family, else `{ tag, previous }`. */
export function plan(tags, release, now) {
  const mine = familyTags(tags, release);
  const done = mine.find((t) => t.sha === release.sha);
  if (done) return { skip: `${release.sha.slice(0, 7)} is already ${done.name}` };
  const previous = mine.at(-1)?.name ?? '';
  if (isBuild(release)) {
    return { tag: `${prefix(release)}${release.version}-b${release.run}`, previous };
  }
  const day = now.toISOString().slice(0, 10).replaceAll('-', '.');
  const n = 1 + Math.max(0, ...mine.filter((t) => t.day === day).map((t) => t.n));
  return { tag: `${prefix(release)}${day}-${n}`, previous };
}

/**
 * `gh release create` arguments: a line on what shipped, then GitHub's notes since the previous
 * tag.
 */
export function createArgs(step, release, runUrl) {
  const notes = `${about(release)}\n\nCommit ${release.sha}, released by ${runUrl}`;
  return [
    'release',
    'create',
    step.tag,
    '--target',
    release.sha,
    '--title',
    `Release ${step.tag}`,
    '--notes',
    notes,
    '--generate-notes',
    ...(step.previous ? ['--notes-start-tag', step.previous] : []),
    // The repository's «Latest» release stays the live web app.
    `--latest=${String(release.kind === 'app')}`,
  ];
}

const realGh = (args) => execFileSync('gh', args, { encoding: 'utf8' });

/** Every tag with the commit it points at (REST; /tags dereferences annotated tags). */
function remoteTags(gh) {
  const jq = '.[] | .name + " " + .commit.sha';
  return gh(['api', '--paginate', 'repos/{owner}/{repo}/tags?per_page=100', '--jq', jq])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, sha] = line.split(' ');
      return { name, sha };
    });
}

/** The release job's run; `gh` and `now` are injectable (tests). */
export function main(env, { gh = realGh, now = new Date() } = {}) {
  const release = readRelease(env);
  const step = plan(remoteTags(gh), release, now);
  if (step.skip) {
    console.log(`::notice::no new release tag: ${step.skip}`);
    return;
  }
  const repo = `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}`;
  gh(createArgs(step, release, `${repo}/actions/runs/${env.GITHUB_RUN_ID}`));
  const line = `### Release [${step.tag}](${repo}/releases/tag/${step.tag}) for \`${release.sha.slice(0, 7)}\``;
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.env);
  } catch (e) {
    console.log(`::warning::release tag not created: ${String(e.message).split('\n')[0]}`);
  }
}
