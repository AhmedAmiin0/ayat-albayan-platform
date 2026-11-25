// Usage (repo root): pnpm components -- --dry-run|--write [--step <types|helpers|hook|all>]
//                    --paths <dir...> [--exclude <file>] [--json]
// Moves a folded component's types into Name.types.ts and its logic into use-name.ts (docs/63 §4).
import { fileURLToPath } from 'node:url';
import { runComponents } from './cli/run.ts';

const root = fileURLToPath(new URL('../../../..', import.meta.url)).replace(/\/$/, '');
runComponents(process.argv.slice(2), { root, cwd: process.cwd(), log: console.log });
