// The first line of a release's notes (release-tag.mjs): what shipped and where its build lives.
// An EAS cloud build links its expo.dev page; a build made on the GitHub runner (mobile.yml builder
// github) links the run's artifact, kept 30 days, and names the file's sha256.
const EAS_URL = /^https:\/\/expo\.dev\/[\w./-]+$/;
const ARTIFACT_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+\/artifacts\/\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const kept = (value, re) => (re.test(value ?? '') ? value : '');

/** The build links the env carries, each kept only when well formed (they end up in the notes). */
export const readLinks = (env) => ({
  easUrl: kept(env.EAS_URL, EAS_URL),
  artifactUrl: kept(env.ARTIFACT_URL, ARTIFACT_URL),
  sha256: kept(env.SHA256, SHA256),
});

const runnerLink = (r) =>
  ` Built on the GitHub runner: ${r.artifactUrl}${r.sha256 ? ` (sha256 ${r.sha256})` : ''}`;
const buildLink = (r) => {
  if (r.artifactUrl) return runnerLink(r);
  return r.easUrl ? ` EAS build: ${r.easUrl}` : '';
};

const ABOUT = {
  app: () => 'Web app https://app.ayatalbayan.com and API https://api.ayatalbayan.com (deploy-staging).',
  apk: (r) => `Android APK, EAS profile ${r.profile}, app version ${r.version}.${buildLink(r)}`,
  aab: (r) =>
    `Android App Bundle (AAB) for Google Play, build ${r.profile}, app version ${r.version}.` +
    buildLink(r),
  ota: (r) => `Over-the-air update (JavaScript only) to the EAS channel ${r.channel}.`,
};

/** One line on what shipped. */
export const about = (release) => ABOUT[release.kind](release);
