// `pnpm lint:parity` (docs/31b §5; CI job «lint parity»): ESLint (every package, no suppressions)
// and Oxlint (oxlint.full.config.ts) on the whole repo, both timed. Fails when Oxlint misses a
// finding ESLint reports (compare.mjs) outside gaps.json, or a rule ESLint turns on for a file is
// off or set otherwise in Oxlint (config-parity.mjs). Writes lint-parity-report.json (details) and
// the job summary. Needs the workspace packages built (type-aware rules), as turbo lint does.
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseJson, readJson } from '../json-file.mjs';
import { ruleOf } from '../oxlint/baseline.mjs';
import { packageDirs } from '../oxlint/gate.mjs';
import { oxlintFiles, runOxlint } from '../oxlint/run.mjs';
import { findingsFile, gapsFile, oxlintReport } from '../oxlint/schemas.mjs';
import { compareFindings, failures, perRule } from './compare.mjs';
import { fileDiff, oxlintRulesFor, summarize } from './config-parity.mjs';
import { eslintConfigs, runEslint } from './eslint-run.mjs';

const timed = async (work) => {
  const started = performance.now();
  const value = await work();
  return { value, seconds: Number(((performance.now() - started) / 1000).toFixed(1)) };
};

const findingsOf = (report) =>
  parseJson(report, oxlintReport).diagnostics.map((d) => ({
    file: d.filename,
    line: d.labels?.[0]?.span.line ?? 0,
    rule: ruleOf(d.code),
  }));

/** Config parity: every ESLint-linted file against the composed Oxlint config. */
async function configLines(root, dirs) {
  const { default: config } = await import(pathToFileURL(join(root, 'oxlint.full.config.ts')).href);
  const linted = new Set(oxlintFiles(root));
  const files = await eslintConfigs(root, dirs);
  const diffs = files.map(({ file, rules }) => ({
    file,
    ...fileDiff(rules, oxlintRulesFor(config, file)),
  }));
  return summarize(
    diffs,
    files.map(({ file }) => file).filter((file) => !linted.has(file)),
  );
}

/** The per-rule table: ESLint, Oxlint, missing, moved and extra counts. */
function table({ eslint, oxlint, missing, moved, extra }) {
  const counts = [eslint, oxlint, missing, moved.map((m) => m.eslint), extra].map(perRule);
  const rules = [...new Set(counts.flatMap(Object.keys))].sort();
  const row = (rule) => `| ${rule} | ${counts.map((c) => String(c[rule] ?? 0)).join(' | ')} |`;
  const head = [
    '| rule | ESLint | Oxlint | missing | moved | extra |',
    '|---|---|---|---|---|---|',
  ];
  return [...head, ...rules.map(row)];
}

async function main() {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const dirs = packageDirs(root);
  const ox = await timed(() => runOxlint(root));
  // LINT_PARITY_ESLINT=<findings.json>: reuse a saved ESLint run (local reruns only; CI runs it).
  const saved = process.env.LINT_PARITY_ESLINT;
  const es = await timed(() => (saved ? readJson(saved, findingsFile) : runEslint(root, dirs)));
  const save = process.env.LINT_PARITY_SAVE;
  if (save) writeFileSync(save, JSON.stringify(es.value));
  const oxlint = findingsOf(ox.value);
  const result = compareFindings(es.value, oxlint);
  const gaps = readJson(fileURLToPath(new URL('./gaps.json', import.meta.url)), gapsFile);
  const lines = [...failures(result.missing, gaps), ...(await configLines(root, dirs))];
  const details = JSON.stringify({ ...result, lines }, null, 1);
  writeFileSync(join(root, 'lint-parity-report.json'), details);
  const summary = [
    `ESLint ${String(es.seconds)} s, Oxlint ${String(ox.seconds)} s (whole repo, this machine).`,
    '',
    ...table({ eslint: es.value, oxlint, ...result }),
    '',
    ...lines.map((line) => `- ${line}`),
  ].join('\n');
  console.log(summary);
  const jobSummary = process.env.GITHUB_STEP_SUMMARY;
  if (jobSummary) appendFileSync(jobSummary, `${summary}\n`);
  if (lines.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
