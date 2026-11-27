// pnpm shared-types:inventory [--json <file>]: the types, enums and constant objects per workspace
// that PR G moves into packages (docs/62 part 3 §4 «Inventory first»).
import { runCli } from './cli.mjs';
import { readTree } from './files.mjs';

const cwd = process.cwd();
process.exitCode = runCli(process.argv.slice(2), {
  log: (line) => console.log(line),
  readFiles: () => readTree(cwd),
});
