// ESLint over every package with NO suppressions (an empty suppressions file), as turbo lint runs
// it (in the package folder, 6 GB heap, three packages at a time): every finding it reports, under
// Oxlint rule names (oxlintName, docs/31b §2), with repo-relative paths.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { oxlintName } from '@ab/config/oxlint';
import { readJson } from '../json-file.mjs';
import { eslintReport } from '../oxlint/schemas.mjs';

const CONCURRENCY = 3;
const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=6144' };

/** One package's ESLint JSON report (exit 0 or 1: clean or findings; else ESLint failed). */
function lintPackage({ root, dir, tmp }) {
  const out = join(tmp, `${dir.replaceAll('/', '_')}.json`);
  const empty = join(tmp, 'empty-suppressions.json');
  const args = ['exec', 'eslint', '.', '-f', 'json', '-o', out, '--suppressions-location', empty];
  return new Promise((done, fail) => {
    const child = spawn('pnpm', [...args, '--pass-on-unpruned-suppressions'], {
      cwd: join(root, dir),
      env,
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    child.on('close', (status) => {
      const ok = status === 0 || status === 1;
      if (ok) done(readJson(out, eslintReport));
      else fail(new Error(`eslint failed in ${dir} (exit ${String(status)})`));
    });
  });
}

/** A report's messages as findings; a parse error (no rule) is `parse-error`. */
const findingsOf = (root, report) =>
  report.flatMap(({ filePath, messages }) =>
    messages.map((m) => ({
      file: relative(root, filePath),
      line: m.line,
      rule: m.ruleId ? oxlintName(m.ruleId) : 'parse-error',
    })),
  );

/** ESLint over `dirs` (repo-relative package folders) of `root`: all findings, unsuppressed. */
export async function runEslint(root, dirs) {
  const tmp = mkdtempSync(join(tmpdir(), 'eslint-parity-'));
  writeFileSync(join(tmp, 'empty-suppressions.json'), '{}');
  const queue = [...dirs];
  const reports = [];
  const worker = async () => {
    for (let dir = queue.shift(); dir !== undefined; dir = queue.shift()) {
      reports.push(await lintPackage({ root, dir, tmp }));
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return reports.flatMap((report) => findingsOf(root, report));
}

const SOURCES = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs', '*.mts', '*.cts'];

/** One package's files ESLint lints, with their resolved rules. */
async function packageConfigs(eslint, root, dir) {
  const listed = spawnSync('git', ['ls-files', '-co', '--exclude-standard', ...SOURCES], {
    cwd: join(root, dir),
    encoding: 'utf8',
  });
  const configs = [];
  for (const file of listed.stdout.split('\n').filter(Boolean)) {
    const path = join(root, dir, file);
    const ignored = await eslint.isPathIgnored(path);
    const config = ignored ? undefined : await eslint.calculateConfigForFile(path);
    if (config) configs.push({ file: `${dir}/${file}`, rules: config.rules });
  }
  return configs;
}

/** Every file ESLint lints in `dirs`, with the rules it resolves for it ({ file, rules }). */
export async function eslintConfigs(root, dirs) {
  const { ESLint } = await import('eslint');
  const configs = [];
  for (const dir of dirs) {
    const eslint = new ESLint({ cwd: join(root, dir) });
    configs.push(...(await packageConfigs(eslint, root, dir)));
  }
  return configs;
}
