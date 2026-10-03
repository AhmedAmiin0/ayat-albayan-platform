// `pnpm create:login --email t@x.com --role teacher --name "اسم المعلمة"`: an auth user (confirmed), its
// profile with the role, and for a teacher the link teachers.profile_id. Idempotent: an existing
// login is reused. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (never in git).
import { allowedSupabase, parseArgs } from './create-login.plan.mjs';

const args = parseArgs(process.argv.slice(2));
const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
if (!args.ok) fail(args.errors.join('\n'));
if (!url || !key) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
if (!allowedSupabase(url)) fail(`Refusing ${url}: only local Supabase or the staging project.`);

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text ? JSON.parse(text) : null };
}

async function findUser(email) {
  const r = await call('/auth/v1/admin/users?per_page=1000');
  return r.ok ? (r.body.users ?? []).find((u) => u.email?.toLowerCase() === email) : null;
}

let user = await findUser(args.email);
let created = false;
if (!user) {
  const r = await call('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: args.email, password: args.password, email_confirm: true }),
  });
  if (!r.ok) fail(`Could not create the login: ${r.status} ${JSON.stringify(r.body)}`);
  user = r.body;
  created = true;
}

const profile = await call('/rest/v1/profiles?on_conflict=id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ id: user.id, role: args.role, full_name: args.name }),
});
if (!profile.ok) fail(`Could not write the profile: ${profile.status} ${JSON.stringify(profile.body)}`);

if (args.role === 'teacher') {
  const name = encodeURIComponent(args.name);
  const link = await call(`/rest/v1/teachers?display_name_ar=eq.${name}&or=(profile_id.is.null,profile_id.eq.${user.id})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ profile_id: user.id }),
  });
  if (!link.ok) fail(`Could not link the teacher: ${link.status} ${JSON.stringify(link.body)}`);
  if (link.body.length !== 1) {
    fail(`Login and profile are ready, but ${link.body.length} teachers matched "${args.name}" (needs exactly 1 free row). Check teachers.display_name_ar.`);
  }
}

console.log(`${created ? 'Created' : 'Reused'} ${args.role} login ${args.email} (${user.id}).`);
if (created) console.log(`Password: ${args.password}${args.generated ? '   (generated: change it after the first login)' : ''}`);
else console.log('The password is unchanged (the login already existed).');
