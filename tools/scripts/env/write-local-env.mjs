// Writes .env files for api, both web apps and e2e from the running local Supabase stack.
// Usage: pnpm env:local (after `pnpm supabase start`). Local-only keys; never used for prod.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const raw = execSync('pnpm --silent --filter @ab/db exec supabase status -o json', {
  encoding: 'utf8',
});
const s = JSON.parse(raw.slice(raw.indexOf('{')));
const web = {
  VITE_SUPABASE_URL: s.API_URL,
  VITE_SUPABASE_ANON_KEY: s.ANON_KEY,
  VITE_API_URL: 'http://localhost:3000',
};

const files = {
  'apps/api/.env': {
    PORT: 3000,
    // The staff app first (its links), then the family web app (docs/51 §4).
    WEB_ORIGIN: 'http://localhost:5173,http://localhost:5174',
    SUPABASE_URL: s.API_URL,
    SUPABASE_JWT_SECRET: s.JWT_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: s.SERVICE_ROLE_KEY,
    DATABASE_URL: s.DB_URL,
    // tools/wa-stub only (pnpm turbo dev starts it on :4010); never Meta from a local run.
    WA_API_BASE: 'http://localhost:4010',
    WA_PHONE_NUMBER_ID: 'stub-phone',
    WA_WABA_ID: 'stub-waba',
    WA_ACCESS_TOKEN: 'local-token',
    WA_APP_ID: 'stub-app',
    WA_APP_SECRET: 'local-app-secret',
    WA_VERIFY_TOKEN: 'local-verify',
    // Signs the public feedback links (>= 32 chars); local only.
    FEEDBACK_TOKEN_SECRET: 'local-feedback-secret-0123456789-abcdef',
    // HMAC pepper of the WhatsApp sign-in codes (>= 32 chars, docs/30); local only.
    LOGIN_CODE_PEPPER: 'local-login-code-pepper-0123456789-abcdef',
  },
  // No VITE_FAMILY_ORIGIN locally: families stay on the staff app unless a developer sets it.
  'apps/staff-web/.env.local': web,
  'apps/family-web/.env.local': { ...web, VITE_STAFF_ORIGIN: 'http://localhost:5173' },
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
