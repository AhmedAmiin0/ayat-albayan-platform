// Writes .env files for api, web and e2e from the running local Supabase stack.
// Usage: pnpm env:local (after `pnpm supabase start`). Local-only keys; never used for prod.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const raw = execSync('pnpm --silent --filter @ab/db exec supabase status -o json', {
  encoding: 'utf8',
});
const s = JSON.parse(raw.slice(raw.indexOf('{')));

const files = {
  'apps/api/.env': {
    PORT: 3000,
    WEB_ORIGIN: 'http://localhost:5173',
    SUPABASE_URL: s.API_URL,
    SUPABASE_JWT_SECRET: s.JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
    DATABASE_URL: s.DB_URL,
    WA_API_BASE: 'http://localhost:4010',
  },
  'apps/web/.env.local': {
    VITE_SUPABASE_URL: s.API_URL,
    VITE_SUPABASE_ANON_KEY: s.ANON_KEY,
    VITE_API_URL: 'http://localhost:3000',
  },
  'e2e/.env': {
    SUPABASE_URL: s.API_URL,
    SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
    DATABASE_URL: s.DB_URL,
  },
};

for (const [path, vars] of Object.entries(files)) {
  const body = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n');
  writeFileSync(path, `${body}\n`);
  console.log(`wrote ${path}`);
}
