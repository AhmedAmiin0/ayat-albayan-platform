// ESLint formatter of ci «verify (lint …)» (`turbo lint -- -f <this file>`, docs/31b §5): prints
// the usual stylish text and saves every finding of the package to <package>/.lint/eslint.json (a
// turbo output, so a replayed package restores it) for lint parity (parity.mjs), which then needs
// no second ESLint run. ESLint moves a finding that eslint-suppressions.json covers into
// suppressedMessages with suppressions [{ kind: 'file' }] (ESLint 10, suppressions-service.js):
// `messages` plus those are exactly a run with no suppressions. Inline eslint-disable comments
// (kind 'directive') stay out, as they do in that run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';

export const FINDINGS = '.lint/eslint.json';

const fileSuppressed = (message) =>
  (message.suppressions ?? []).some((suppression) => suppression.kind === 'file');

const slim = ({ ruleId, line }) => ({ ruleId: ruleId ?? null, line });

/** ESLint results as `eslint -f json` with bulk-suppressed findings put back into messages. */
export const findingsReport = (results) =>
  results.map(({ filePath, messages, suppressedMessages }) => ({
    filePath,
    messages: [...messages, ...(suppressedMessages ?? []).filter(fileSuppressed)].map(slim),
  }));

export default async function format(results, context) {
  const out = join(context.cwd, FINDINGS);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(findingsReport(results)));
  const stylish = await new ESLint({ cwd: context.cwd }).loadFormatter('stylish');
  return stylish.format(results, context);
}
