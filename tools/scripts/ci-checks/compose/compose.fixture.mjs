// deploy/staging (PRODUCTION, legacy name), loaded once for the compose guards
// (compose.test.mjs, compose-roll.test.mjs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const root = (p) => fileURLToPath(new URL(`../../../../${p}`, import.meta.url));
export const composePath = root('deploy/staging/docker-compose.yml');
export const compose = parse(readFileSync(composePath, 'utf8'), { merge: true });
export const caddy = readFileSync(root('deploy/staging/lb/Caddyfile'), 'utf8');
export const roll = readFileSync(root('deploy/staging/roll.sh'), 'utf8');
export const rollback = readFileSync(root('deploy/staging/rollback.sh'), 'utf8');
export const deploy = readFileSync(root('.github/workflows/deploy-production.yml'), 'utf8');
export const services = compose.services;
export const APPS = ['ayat-worker', 'ayat-api-a', 'ayat-api-b'];
export const mb = (v) => Number(/^(\d+)M$/.exec(v)?.[1] ?? NaN);
