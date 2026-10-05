// The test teacher's sign-in account, two ways (seed-test-account.mjs picks one with authMode):
// - 'admin-api': Supabase Auth Admin REST (what admin.createUser / updateUserById call), when
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set;
// - 'sql': auth.users + auth.identities written directly, as Supabase's own SQL seeds do (bcrypt via
//   pgcrypto, email confirmed, token columns '' — GoTrue fails sign-in on NULL there).
// Nothing here logs the email, the password or a response body.
import { accountMetadata, adminUsersUrl, isTestAccount } from './seed-test-account.plan.mjs';

/** The login with this email: { id, ours } or null. `ours` = stamped by this script. */
export async function findAccount(sql, email) {
  const [row] = await sql`
    select id, raw_user_meta_data as meta from auth.users where lower(email) = ${email} limit 1`;
  return row ? { id: row.id, ours: isTestAccount(row.meta) } : null;
}

async function admin(ctx, req) {
  const res = await fetch(adminUsersUrl(ctx.url, req.id), {
    method: req.method,
    headers: {
      apikey: ctx.key,
      authorization: `Bearer ${ctx.key}`,
      'content-type': 'application/json',
    },
    body: req.body ? JSON.stringify(req.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = json.error_code ?? json.code ?? 'unknown';
    throw new Error(`Auth Admin API ${req.method} failed: HTTP ${res.status} (${code})`);
  }
  return json;
}

/** Creates or updates the login through the Admin API; returns its id. */
export async function upsertViaAdminApi(ctx, { creds, existing }) {
  const body = { password: creds.password, email_confirm: true, user_metadata: accountMetadata() };
  if (existing) {
    await admin(ctx, { method: 'PUT', id: existing.id, body });
    return existing.id;
  }
  const user = await admin(ctx, { method: 'POST', body: { ...body, email: creds.email } });
  return user.id;
}

/** Creates or updates the login with SQL (inside the caller's transaction); returns its id. */
export async function upsertViaSql(tx, { creds, existing }) {
  if (existing) {
    await tx`
      update auth.users set encrypted_password = extensions.crypt(${creds.password}, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()), banned_until = null, updated_at = now()
      where id = ${existing.id}`;
    return existing.id;
  }
  const meta = { ...accountMetadata(), email_verified: true };
  const [user] = await tx`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new,
      email_change, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      ${creds.email}, extensions.crypt(${creds.password}, extensions.gen_salt('bf')), now(),
      ${tx.json({ provider: 'email', providers: ['email'] })}, ${tx.json(meta)}, '', '', '', '', now(), now())
    returning id`;
  const identity = {
    sub: user.id,
    email: creds.email,
    email_verified: true,
    phone_verified: false,
  };
  await tx`
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at)
    values (${user.id}, ${user.id}, ${tx.json(identity)}, 'email', now(), now(), now())`;
  return user.id;
}

/** Deletes the login (profiles and identities cascade). */
export async function deleteAccount(sql, { ctx, id }) {
  if (ctx) {
    await admin(ctx, { method: 'DELETE', id });
    return;
  }
  await sql`delete from auth.users where id = ${id}`;
}

/** The teacher role the app reads (profiles.role → JWT claim user_role via the auth hook). */
export async function upsertTeacherProfile(tx, { id, fullName }) {
  await tx`
    insert into public.profiles (id, role, full_name) values (${id}, 'teacher', ${fullName})
    on conflict (id) do update set role = 'teacher', full_name = excluded.full_name`;
}
