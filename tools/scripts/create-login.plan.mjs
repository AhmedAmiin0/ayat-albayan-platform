// Pure parts of `pnpm create:login`: argument parsing and the target guard. No network here.
import { randomBytes } from 'node:crypto';
import { STAGING_REF } from './clear-demo.plan.mjs';

const ROLES = ['teacher', 'admin', 'assistant'];
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** Local Supabase, or the hosted STAGING project (never production). */
export function allowedSupabase(url) {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname;
  return LOCAL_HOSTS.includes(host) || host === `${STAGING_REF}.supabase.co`;
}

/** `--email a@b.c --role teacher --name "اسم" [--password x]`; a missing password is generated. */
export function parseArgs(argv, rand = () => randomBytes(9).toString('base64url')) {
  const flag = (n) => {
    const i = argv.indexOf(`--${n}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const email = flag('email')?.trim().toLowerCase();
  const role = flag('role') ?? 'teacher';
  const name = flag('name')?.trim();
  const errors = [];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('--email is required and must be an email');
  if (!ROLES.includes(role)) errors.push(`--role must be one of ${ROLES.join(', ')}`);
  if (!name) errors.push('--name is required (the full name; for a teacher it must equal teachers.display_name_ar)');
  const given = flag('password');
  if (given !== undefined && given.length < 8) errors.push('--password must be at least 8 characters');
  return { ok: errors.length === 0, errors, email, role, name, password: given ?? rand(), generated: given === undefined };
}
