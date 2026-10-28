// Did anything that needs a NEW native build change since the last build? (mobile.yml OTA guard)
// An OTA update only swaps JavaScript; a native dependency, plugin or app.json native field needs an APK.
// Usage: node tools/scripts/native-changes.mjs <lastBuildCommit>   exit 1 = native change found.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MOBILE = 'apps/mobile';
// runtimeVersion.policy is appVersion, so `version` decides which builds an update reaches.
const NATIVE_KEYS = ['version', 'sdkVersion', 'plugins', 'android', 'ios', 'scheme', 'newArchEnabled',
  'jsEngine', 'runtimeVersion', 'owner', 'slug', 'name', 'icon', 'splash', 'orientation', 'userInterfaceStyle',
  'notification', 'androidStatusBar', 'updates'];
// Bundled into the binary (app.json icon/adaptive icon/splash = top-level assets) or deciding how it is
// built: a change needs an APK. Images in assets/<folder>/ (tabs, brand) are imported from JS and travel
// inside the OTA bundle, so they are not native.
const NATIVE_PATHS = [`${MOBILE}/assets`, `${MOBILE}/eas.json`];
const isNativeAsset = (f) => /^apps\/mobile\/assets\/[^/]+$/.test(f);
// eas.json profiles that never build the normal app (docs/30: the separate Stripe test app): editing one is no
// reason for a new preview / production APK. Every other part of eas.json still is.
const SIDE_PROFILES = ['stripe-test'];
const easCore = (text) => {
  try {
    const eas = JSON.parse(text);
    for (const p of SIDE_PROFILES) delete eas.build?.[p];
    return JSON.stringify(eas);
  } catch {
    return `unparsed:${text}`;
  }
};
// Pure-JS packages (no native code, no config plugin): a version change ships by OTA.
// Google fonts are .ttf files loaded at runtime by expo-font's useFonts, not embedded by its plugin.
// @shopify/flash-list v2 is a JS-only recycler on the New Architecture: its package ships dist/*.js and
// src/*.ts, no android/, ios/, podspec or config plugin (checked on 2.0.2, the SDK 57 version). Only
// major 2 counts: 1.x shipped a native AutoLayoutView, and a later major may add native code again.
const JS_ONLY_DEPS = [/^@expo-google-fonts\//, /^@tanstack\//, /^@supabase\/supabase-js$/];
const JS_ONLY_AT = { '@shopify/flash-list': /^\D*2\./ };
const jsOnly = (name, version) =>
  String(version).startsWith('workspace:') ||
  (name in JS_ONLY_AT ? JS_ONLY_AT[name].test(String(version)) : JS_ONLY_DEPS.some((r) => r.test(name)));

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function nativeChanges(before, after, changedFiles = []) {
  const found = [];
  const a = JSON.parse(before.appJson || '{}').expo ?? {};
  const b = JSON.parse(after.appJson || '{}').expo ?? {};
  for (const k of NATIVE_KEYS) if (!same(a[k], b[k])) found.push(`app.json: expo.${k}`);
  // configOut: the normal app's evaluated config (configOut below); unknown on either side → the text decides.
  const evaluated = typeof before.configOut === 'string' && typeof after.configOut === 'string';
  const configSame = before.appConfig === after.appConfig || (evaluated && before.configOut === after.configOut);
  if (!configSame) found.push('app.config.ts changed (dynamic config)');
  const da = JSON.parse(before.pkg || '{}').dependencies ?? {};
  const db = JSON.parse(after.pkg || '{}').dependencies ?? {};
  for (const name of new Set([...Object.keys(da), ...Object.keys(db)])) {
    if (da[name] === db[name] || jsOnly(name, db[name] ?? da[name])) continue;
    found.push(`dependency ${name}: ${da[name] ?? '(none)'} -> ${db[name] ?? '(removed)'}`);
  }
  for (const f of changedFiles) if (isNativeAsset(f)) found.push(`${f} changed`);
  const easKnown = typeof before.eas === 'string' && typeof after.eas === 'string';
  const easChanged = easKnown ? easCore(before.eas) !== easCore(after.eas) : changedFiles.includes(`${MOBILE}/eas.json`);
  if (easChanged) found.push(`${MOBILE}/eas.json changed`);
  return found;
}

/**
 * app.config.ts evaluated as EAS evaluates it for the normal app (APP_VARIANT unset), from the same app.json
 * on both sides, so only its own logic is compared: a change that only adds a side variant (APP_VARIANT,
 * docs/30) leaves it equal. null when it cannot be evaluated (the text comparison decides then).
 */
export async function configOut(source, appJson) {
  if (!source) return null;
  const dir = mkdtempSync(join(tmpdir(), 'app-config-'));
  const variant = process.env.APP_VARIANT;
  try {
    const file = join(dir, 'app.config.mts');
    writeFileSync(file, source);
    delete process.env.APP_VARIANT;
    const mod = await import(pathToFileURL(file).href);
    return JSON.stringify(mod.default({ config: JSON.parse(appJson || '{}').expo ?? {} }));
  } catch {
    return null;
  } finally {
    if (variant !== undefined) process.env.APP_VARIANT = variant;
    rmSync(dir, { recursive: true, force: true });
  }
}

const show = (ref, file) => {
  try {
    return execFileSync('git', ['show', `${ref}:${MOBILE}/${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};
const changedSince = (ref) => {
  try {
    const out = execFileSync('git', ['diff', '--name-only', ref, 'HEAD', '--', ...NATIVE_PATHS], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    return [`${NATIVE_PATHS.join(', ')} (git diff failed)`];
  }
};
const snapshot = (ref) => ({ appJson: show(ref, 'app.json'), appConfig: show(ref, 'app.config.ts'), pkg: show(ref, 'package.json'), eas: show(ref, 'eas.json') });

async function main() {
  const last = process.argv[2];
  if (!last || !/^[0-9a-f]{7,40}$/.test(last)) { console.error('::error::need the last build commit'); process.exit(2); }
  const [before, after] = [snapshot(last), snapshot('HEAD')];
  if (before.appConfig !== after.appConfig) {
    before.configOut = await configOut(before.appConfig, after.appJson);
    after.configOut = await configOut(after.appConfig, after.appJson);
  }
  const found = nativeChanges(before, after, changedSince(last));
  for (const f of found) console.log(`native change since ${last.slice(0, 7)}: ${f}`);
  if (!found.length) console.log('no native change: an OTA update is enough');
  process.exit(found.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
