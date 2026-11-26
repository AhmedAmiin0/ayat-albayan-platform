// Usage: [GUARD_BASE=<base checkout>] node gate.mjs
import { gate } from './run.mjs';

process.exitCode = gate({ env: process.env, cwd: process.cwd(), log: console.log });
