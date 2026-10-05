// Did anything that needs a NEW native build change since the last build? (mobile.yml OTA guard)
// An OTA update only swaps JavaScript; a native dependency, plugin or app.json native field needs an APK.
// Usage: node tools/scripts/native-changes.mjs <lastBuildCommit>   exit 1 = native change found.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MOBILE = 'apps/mobile';
// runtimeVersion.policy is appVersion, so `version` decides which builds an update reaches.
const NATIVE_KEYS = ['version', 'sdkVersion', 'plugins', 'android', 'ios', 'scheme', 'newArchEnabled',
  'jsEngine', 'runtimeVersion', 'owner', 'slug'];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function nativeChanges(before, after) {
  const found = [];
  const a = JSON.parse(before.appJson || '{}').expo ?? {};
  const b = JSON.parse(after.appJson || '{}').expo ?? {};
  for (const k of NATIVE_KEYS) if (!same(a[k], b[k])) found.push(`app.json: expo.${k}`);
  if (before.appConfig !== after.appConfig) found.push('app.config.ts changed (dynamic config)');
  const da = JSON.parse(before.pkg || '{}').dependencies ?? {};
  const db = JSON.parse(after.pkg || '{}').dependencies ?? {};
  for (const name of new Set([...Object.keys(da), ...Object.keys(db)])) {
    if (da[name] !== db[name]) found.push(`dependency ${name}: ${da[name] ?? '(none)'} -> ${db[name] ?? '(removed)'}`);
  }
  return found;
}

const show = (ref, file) => {
  try {
    return execFileSync('git', ['show', `${ref}:${MOBILE}/${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};
const snapshot = (ref) => ({ appJson: show(ref, 'app.json'), appConfig: show(ref, 'app.config.ts'), pkg: show(ref, 'package.json') });

function main() {
  const last = process.argv[2];
  if (!last || !/^[0-9a-f]{7,40}$/.test(last)) { console.error('::error::need the last build commit'); process.exit(2); }
  const found = nativeChanges(snapshot(last), snapshot('HEAD'));
  for (const f of found) console.log(`native change since ${last.slice(0, 7)}: ${f}`);
  if (!found.length) console.log('no native change: an OTA update is enough');
  process.exit(found.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
