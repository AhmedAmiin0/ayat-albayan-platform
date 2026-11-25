// Usage: node gate.mjs (from the repository root): every tracked file in scope.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { check } from './run.mjs';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 28 });

process.exitCode = check({
  paths: tracked.split('\0').filter(Boolean),
  read: (path) => readFileSync(path, 'utf8'),
  log: console.log,
});
