import type { Tx } from '../core/rls';

// The catalogue reads behind rls-catalogue.sql.spec.ts (audit OPS-8, docs/58 §4). Objects an
// extension owns are left out: their grants are the extension's, not ours.

const notExtension = (oid: string) => `not exists (select 1 from pg_depend d
  where d.objid = ${oid} and d.deptype = 'e')`;

/** Tables and partitioned tables in public with row level security off. */
export async function tablesWithoutRls(tx: Tx): Promise<string[]> {
  const rows = await tx.unsafe<{ name: string }[]>(`select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
      and ${notExtension('c.oid')}
    order by 1`);
  return rows.map((r) => r.name);
}

/**
 * What anon can read (a column grant counts): a table it may select with a permissive read policy for anon or public, a
 * view that runs as its owner (RLS of the tables below does not apply), or a materialized view.
 */
export async function anonReadable(tx: Tx): Promise<string[]> {
  const rows = await tx.unsafe<{ name: string }[]>(`select c.relname as name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
      and has_any_column_privilege('anon', c.oid, 'select') and ${notExtension('c.oid')}
      and (c.relkind = 'm'
        or (c.relkind = 'v' and not coalesce('security_invoker=true' = any (c.reloptions)
          or 'security_invoker=on' = any (c.reloptions), false))
        or (c.relkind in ('r', 'p') and exists (select 1 from pg_policy p
          where p.polrelid = c.oid and p.polpermissive and p.polcmd in ('r', '*')
            and (0 = any (p.polroles) or 'anon'::regrole = any (p.polroles)))))
    order by 1`);
  return rows.map((r) => r.name);
}

/**
 * SECURITY DEFINER functions in public that `role` may execute, as `name(arg types)`. Trigger
 * functions are left out: Postgres refuses to call them outside a trigger.
 */
export async function callableDefiners(tx: Tx, role: 'anon' | 'authenticated'): Promise<string[]> {
  const rows = await tx.unsafe<{ name: string }[]>(
    `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
      and has_function_privilege($1, p.oid, 'execute')
      and ${notExtension('p.oid')}
    order by 1`,
    [role],
  );
  return rows.map((r) => r.name);
}

/** Found names an allow-list does not hold. */
export const outside = (found: string[], allowed: Record<string, string>): string[] =>
  found.filter((name) => !(name in allowed));
