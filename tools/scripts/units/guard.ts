// Usage (repo root): pnpm guard:units [-- --write]
import { fileURLToPath } from 'node:url';
import { runGuard } from './guard/run.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
process.exitCode = runGuard(process.argv.slice(2), { root, log: console.log });
