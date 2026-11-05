// docs/38 «Review corrections» 1 (BLOCKING): expo-sharing ships a prebuilt AAR (local-maven-repo)
// and Gradle links it unless autolinking lists the package in buildFromSource; the pnpm patch to
// ResolvingShareIntentDataParser.kt (a "../" display name, same-named files) would then never be
// compiled. This asks the autolinking resolver itself, as the Gradle settings plugin does on EAS
// (SettingsManager: shouldUsePublication = !buildFromSourceRegex.matches(project.name) && …).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const mobilePkg = fileURLToPath(new URL('../../../apps/mobile/package.json', import.meta.url));
const workspace = readFileSync(fileURLToPath(new URL('../../../pnpm-workspace.yaml', import.meta.url)), 'utf8');
const fromMobile = createRequire(mobilePkg);
const sharingRoot = dirname(fromMobile.resolve('expo-sharing/package.json'));
const fromExpo = createRequire(fromMobile.resolve('expo/package.json'));
const autolinking = join(dirname(fromExpo.resolve('expo-modules-autolinking/package.json')), 'bin', 'expo-modules-autolinking.js');
const PATCHED = 'File(context.cacheDir, "share-${java.util.UUID.randomUUID()}-${File(fileName).name}")';

test('apps/mobile asks autolinking to build expo-sharing from source', () => {
  const pkg = JSON.parse(readFileSync(mobilePkg, 'utf8'));
  assert.ok(pkg.expo.autolinking.android.buildFromSource.includes('expo-sharing'));
});

test('the resolver builds every expo-sharing Android project from source, not from its AAR', () => {
  const out = execFileSync(process.execPath, [autolinking, 'resolve', '-p', 'android', '--json'], {
    cwd: dirname(mobilePkg),
    encoding: 'utf8',
  });
  const resolved = JSON.parse(out);
  const regexes = (resolved.configuration.buildFromSource ?? []).map((s) => new RegExp(s));
  const projects = resolved.modules.find((m) => m.packageName === 'expo-sharing')?.projects ?? [];
  assert.ok(projects.length > 0, 'expo-sharing is autolinked');
  for (const p of projects) assert.ok(regexes.some((r) => r.test(p.name)), `${p.name} uses its AAR`);
});

test('the pnpm patch is declared for the installed version and applied to its Kotlin', () => {
  const version = JSON.parse(readFileSync(join(sharingRoot, 'package.json'), 'utf8')).version;
  assert.match(workspace, new RegExp(`expo-sharing@${version.replaceAll('.', '\\.')}: patches/expo-sharing@`));
  const kt = readFileSync(
    join(sharingRoot, 'android/src/main/java/expo/modules/sharing/dataParsers/ResolvingShareIntentDataParser.kt'),
    'utf8',
  );
  assert.ok(kt.includes(PATCHED), 'the patched cache name');
  assert.ok(!kt.includes('File(context.cacheDir, fileName)'), 'the raw display name is gone');
});
