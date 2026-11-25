// Usage: [GUARD_BASE=<base checkout>] node gate.mjs [--whole <workspace>]
import { gate } from './run.mjs';

process.exitCode = gate({
  argv: process.argv.slice(2),
  env: process.env,
  cwd: process.cwd(),
  log: console.log,
});
