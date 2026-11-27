// Usage (repo root): pnpm api:one -- [--write] [--exclude <file>]
// Rewrites apiFetch/apiSend calls and their test mocks to call() and mockCall() (docs/62 §3b).
import { fileURLToPath } from 'node:url';
import { runApiOne } from './cli/run.ts';

const root = fileURLToPath(new URL('../../../..', import.meta.url)).replace(/\/$/, '');
runApiOne(process.argv.slice(2), { root, cwd: process.cwd(), log: console.log });
