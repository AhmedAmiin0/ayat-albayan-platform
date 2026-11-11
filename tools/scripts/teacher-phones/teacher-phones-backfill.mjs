#!/usr/bin/env node
// docs/46 A7: teacher logins without a phone take their teacher record's number, unless another
// profile or a guardian row holds it («Shared numbers»: the family keeps its code sign-in). Never
// connects to a database: it prints SQL the operator reviews and runs. Production: owner's go only.
//
//   node tools/scripts/teacher-phones/teacher-phones-backfill.mjs          → dry run (the default):
//      a read-only SELECT of the counts; psql "$DB" -At -f dry-run.sql writes nothing.
//   node tools/scripts/teacher-phones/teacher-phones-backfill.mjs --apply  → one transaction;
//      re-runnable (a profile with a phone no longer matches; a lost race hits the unique index).

/** Teacher logins (role teacher) with no phone whose record has one nobody else holds. */
export const CANDIDATES = `with candidates as (
  select p.id as profile_id, t.phone_e164 as phone
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  where p.role = 'teacher' and p.phone_e164 is null and t.phone_e164 is not null
), free as (
  select c.profile_id, c.phone from candidates c
  where not exists (select 1 from public.profiles o where o.phone_e164 = c.phone)
    and not exists (select 1 from public.guardians g where g.phone_e164 = c.phone)
)`;

export const DRY_RUN_SQL = `-- teacher-phones backfill: DRY RUN (read only, counts only).
${CANDIDATES}
select (select count(*) from candidates) as phoneless_teacher_logins,
       (select count(*) from free) as to_copy,
       (select count(*) from candidates) - (select count(*) from free) as kept_null_shared;
`;

export const APPLY_SQL = `-- teacher-phones backfill: APPLY (review first; production only on the owner's go).
begin;
${CANDIDATES}
update public.profiles p set phone_e164 = f.phone
from free f
where p.id = f.profile_id and p.phone_e164 is null;
commit;
`;

export function parseArgs(argv) {
  return { apply: argv.includes('--apply') };
}

/** The SQL for the arguments: the dry run unless --apply is given. */
export const run = (args) => (args.apply ? APPLY_SQL : DRY_RUN_SQL);

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(run(parseArgs(process.argv.slice(2))));
}
