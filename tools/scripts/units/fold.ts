// Usage (repo root): pnpm units:fold -- --dry-run [--paths <dir...>] [--skip-open-prs]
//                    pnpm units:fold -- --write --paths <dir...> [--skip-open-prs]
// A unit with 3+ files moves into its own folder with an index.ts; its tests go to tests/ when it
// has 2+ (CLAUDE.md rule 13). Every reference follows with `git mv`.
import { fileURLToPath } from 'node:url';
import { runFold } from './cli/run.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
runFold(process.argv.slice(2), { root, cwd: process.cwd(), log: console.log });
