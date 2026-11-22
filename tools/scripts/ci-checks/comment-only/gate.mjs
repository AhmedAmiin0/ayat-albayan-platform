// Usage: [GITHUB_HEAD_REF=…] [GUARD_BASE=<base checkout>] node gate.mjs [--branch <name>]
import { gate } from './run.mjs';

process.exitCode = gate({
  argv: process.argv.slice(2),
  env: process.env,
  cwd: process.cwd(),
  log: console.log,
});
