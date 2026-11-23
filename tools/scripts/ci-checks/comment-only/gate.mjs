// Usage: [GITHUB_HEAD_REF=…] [GUARD_BASE=<base checkout>] node gate.mjs [--branch <name>]
// The suppression JSONs are allowed through here and guarded by guard:lint and lint parity.
import { gate } from './run.mjs';

process.exitCode = gate({
  argv: process.argv.slice(2),
  env: process.env,
  cwd: process.cwd(),
  log: console.log,
});
