// Did anything that needs a NEW native build change since the last build? (mobile.yml OTA guard)
// An OTA update only swaps JavaScript; a native dependency, plugin or app.json native field needs an APK.
// Usage: node tools/scripts/ci-checks/native-changes.mjs <lastBuildCommit> [easProfile]   exit 1 = native change found.
// easProfile (default preview) is the build the OTA targets: a side profile (stripe-test) compares ITS app.
// Env APP_DIR (default apps/staff-mobile): the Expo app compared; mobile.yml app=family sets
// apps/family-mobile.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { changedFiles, readAt } from './native/renames.mjs';

const MOBILE = /^apps\/[a-z][a-z-]*$/.exec(process.env.APP_DIR ?? '')?.[0] ?? 'apps/staff-mobile';
// runtimeVersion.policy is appVersion, so `version` decides which builds an update reaches.
const NATIVE_KEYS = ['version', 'sdkVersion', 'plugins', 'android', 'ios', 'scheme', 'newArchEnabled',
  'jsEngine', 'runtimeVersion', 'owner', 'slug', 'name', 'icon', 'splash', 'orientation', 'userInterfaceStyle',
  'notification', 'androidStatusBar', 'updates'];
// Bundled into the binary (app.json icon/adaptive icon/splash = top-level assets) or deciding how it is
// built: a change needs an APK. Images in assets/<folder>/ (tabs, brand) are imported from JS and travel
// inside the OTA bundle, so they are not native (family-mobile's app.json uses staff-mobile's).
const ASSETS = [...new Set([`${MOBILE}/assets`, 'apps/staff-mobile/assets'])];
const NATIVE_PATHS = [...ASSETS, `${MOBILE}/eas.json`, `${MOBILE}/plugins`, 'patches'];
const isNativeAsset = (f) => new RegExp(`^(${MOBILE}|apps/staff-mobile)/assets/[^/]+$`).test(f);
// docs/38: config plugins write native code at prebuild, pnpm patches native sources (not tests).
const isNativeSource = (f) =>
  new RegExp(`^(${MOBILE}/plugins|patches)/`).test(f) && !/(\.test\.|__snapshots__)/.test(f);
// eas.json profiles that never build the normal app (docs/30 Stripe test app; docs/50 family-*, now apps/family-mobile):
// editing one is no reason for a new preview / production APK. Every other part of eas.json still is. For a
// side profile's own OTA it is the reverse: only that profile (and the non-build parts) decide.
export const SIDE_PROFILES = ['stripe-test', 'family-preview', 'family-production'];
// A profile's EXPO_PUBLIC_* env is inlined into the JS bundle, never the binary: an OTA brings
// its own value (mobile.yml's EAS update step), so changing one needs no APK (docs/30).
const nativeEnv = (env) => Object.fromEntries(Object.entries(env ?? {}).filter(([k]) => !k.startsWith('EXPO_PUBLIC_')));
const easCore = (text, profile) => {
  try {
    const eas = JSON.parse(text);
    const side = SIDE_PROFILES.includes(profile);
    for (const p of Object.keys(eas.build ?? {}))
      if (side ? p !== profile : SIDE_PROFILES.includes(p)) delete eas.build[p];
    for (const p of Object.values(eas.build ?? {})) p.env = nativeEnv(p.env);
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
// zod (docs/36 g5): plain JS, no android/, ios/ or config plugin (checked on 4.6.5).
const JS_ONLY_DEPS = [/^@expo-google-fonts\//, /^@tanstack\//, /^@supabase\/supabase-js$/, /^zod$/];
const JS_ONLY_AT = { '@shopify/flash-list': /^\D*2\./ };
const jsOnly = (name, version) =>
  String(version).startsWith('workspace:') ||
  (name in JS_ONLY_AT
    ? JS_ONLY_AT[name].test(String(version)) : JS_ONLY_DEPS.some((r) => r.test(name)));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** changes: the files changed since the build, and the eas.json profile the OTA targets (default preview). */
export function nativeChanges(before, after, { files: changedFiles = [], profile = 'preview' } = {}) {
  const found = [];
  const a = JSON.parse(before.appJson || '{}').expo ?? {};
  const b = JSON.parse(after.appJson || '{}').expo ?? {};
  for (const k of NATIVE_KEYS) if (!same(a[k], b[k])) found.push(`app.json: expo.${k}`);
  // configOut: the target app's evaluated config (configOut below); unknown on either side → the text decides.
  const evaluated = typeof before.configOut === 'string' && typeof after.configOut === 'string';
  const configSame =
    before.appConfig === after.appConfig || (evaluated && before.configOut === after.configOut);
  if (!configSame) found.push('app.config.ts changed (dynamic config)');
  const [pa, pb] = [JSON.parse(before.pkg || '{}'), JSON.parse(after.pkg || '{}')];
  const da = pa.dependencies ?? {};
  const db = pb.dependencies ?? {};
  for (const name of new Set([...Object.keys(da), ...Object.keys(db)])) {
    if (da[name] === db[name] || jsOnly(name, db[name] ?? da[name])) continue;
    found.push(`dependency ${name}: ${da[name] ?? '(none)'} -> ${db[name] ?? '(removed)'}`);
  }
  // package.json "expo": autolinking (buildFromSource: a module compiled from its patched source).
  if (!same(pa.expo, pb.expo)) found.push('package.json: expo (autolinking)');
  for (const f of changedFiles) if (isNativeAsset(f) || isNativeSource(f)) found.push(`${f} changed`);
  const easKnown = typeof before.eas === 'string' && typeof after.eas === 'string';
  const easChanged = easKnown ? easCore(before.eas, profile) !== easCore(after.eas, profile) : changedFiles.includes(`${MOBILE}/eas.json`);
  if (easChanged) found.push(`${MOBILE}/eas.json changed`);
  return found;
}

/**
 * app.config.ts evaluated as EAS evaluates it for one app (variant = its APP_VARIANT; undefined = the normal
 * app), from the same app.json on both sides, so only its own logic is compared: a change that only touches a
 * side variant (docs/30) leaves the normal app's equal. null when it cannot be evaluated (the text decides then).
 */
export async function configOut(source, appJson, variant) {
  if (!source) return null;
  const dir = mkdtempSync(join(tmpdir(), 'app-config-'));
  const prior = process.env.APP_VARIANT;
  try {
    const file = join(dir, 'app.config.mts');
    writeFileSync(file, source);
    if (variant === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = variant;
    const mod = await import(pathToFileURL(file).href);
    return JSON.stringify(mod.default({ config: JSON.parse(appJson || '{}').expo ?? {} }));
  } catch {
    return null;
  } finally {
    if (prior === undefined) delete process.env.APP_VARIANT;
    else process.env.APP_VARIANT = prior;
    rmSync(dir, { recursive: true, force: true });
  }
}

// A build from before the folder move is read at its old paths, by content (native/renames.mjs).
const show = (ref, file) => readAt(ref, MOBILE, file);
const changedSince = (ref) => changedFiles(ref, NATIVE_PATHS);
/** The APP_VARIANT an eas.json profile builds with (undefined = the normal app). */
export function variantOf(easText, profile) {
  try {
    const v = JSON.parse(easText).build?.[profile]?.env?.APP_VARIANT;
    return typeof v === 'string' ? v : undefined;
  } catch {
    return undefined;
  }
}
const snapshot = (ref) => ({ appJson: show(ref, 'app.json'), appConfig: show(ref, 'app.config.ts'), pkg: show(ref, 'package.json'), eas: show(ref, 'eas.json') });

async function main() {
  const [last, profile = 'preview'] = process.argv.slice(2);
  if (!last || !/^[0-9a-f]{7,40}$/.test(last)) { console.error('::error::need the last build commit'); process.exit(2); }
  if (!/^[a-z][a-z-]*$/.test(profile)) { console.error(`::error::bad eas profile ${profile}`); process.exit(2); }
  const [before, after] = [snapshot(last), snapshot('HEAD')];
  const variant = variantOf(after.eas, profile);
  if (before.appConfig !== after.appConfig) {
    before.configOut = await configOut(before.appConfig, after.appJson, variant);
    after.configOut = await configOut(after.appConfig, after.appJson, variant);
  }
  const found = nativeChanges(before, after, { files: changedSince(last), profile });
  for (const f of found) console.log(`native change since ${last.slice(0, 7)}: ${f}`);
  if (!found.length) console.log(`no native change (${profile}): an OTA update is enough`);
  process.exit(found.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
