#!/usr/bin/env node
// docs/46 A7: teacher logins without a phone take their teacher record's number, unless another
// profile or a guardian row holds it («Shared numbers»: the family keeps its code sign-in). Never
// connects to a database: it prints SQL the operator reviews and runs. Production: owner's go only.
//
//   node tools/scripts/teacher-phones/teacher-phones-backfill.mjs          → dry run (the default):
//      a read-only SELECT listing every row it would write (teacher id + name, login id, masked
//      phone) and the checksum of the login ids; psql "$DB" -f dry-run.sql writes nothing.
//   node tools/scripts/teacher-phones/teacher-phones-backfill.mjs --apply \
//      --ids=<id,…> --checksum=<md5>
//      → one transaction writing EXACTLY the reviewed rows (login ids AND phones, from the dry
//      run's ids + checksum); it rolls back when anything differs. Re-runnable (a set phone no
//      longer matches; a lost race hits the unique index).

const MD5 = /^[0-9a-f]{32}$/;
/** The reviewed rows' fingerprint: login ids AND the phones they would get, in id order. */
const PAIRS = `string_agg(profile_id::text || ':' || phone, ',' order by profile_id)`;
const CHECKSUM = `md5(coalesce(${PAIRS}, ''))`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Teacher logins (role teacher) with no phone whose record has one nobody else holds. */
export const CANDIDATES = `with candidates as (
  select p.id as profile_id, t.id as teacher_id, t.display_name_ar as name, t.phone_e164 as phone
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  where p.role = 'teacher' and p.phone_e164 is null and t.phone_e164 is not null
), free as (
  select c.* from candidates c
  where not exists (select 1 from public.profiles o where o.phone_e164 = c.phone)
    and not exists (select 1 from public.guardians g where g.phone_e164 = c.phone)
)`;

/** +9665•••••123: enough to recognise the number, never the whole of it in a terminal or log. */
const MASKED =
  `left(f.phone, 5) || repeat('•', greatest(length(f.phone) - 8, 0)) || right(f.phone, 3)`;

export const DRY_RUN_SQL = `-- teacher-phones backfill: DRY RUN (read only): review every row.
${CANDIDATES}
select f.teacher_id, f.name, f.profile_id as login_id, ${MASKED} as phone
from free f order by f.profile_id;
${CANDIDATES}
select (select count(*) from candidates) as phoneless_teacher_logins,
       (select count(*) from free) as to_copy,
       (select count(*) from candidates) - (select count(*) from free) as kept_null_shared,
       (select string_agg(profile_id::text, ',' order by profile_id) from free) as ids,
       (select ${CHECKSUM} from free) as checksum;
`;

/** The reviewed login ids: lower-case UUIDs, sorted, no duplicates; throws on anything else. */
export function reviewedIds(raw) {
  const ids = [...new Set(String(raw ?? '').split(',').map((s) => s.trim().toLowerCase()))];
  const bad = ids.filter((id) => !UUID.test(id));
  if (bad.length > 0 || ids.length === 0) throw new Error('--ids needs the dry run\'s login ids');
  return ids.sort();
}

/** The dry run's checksum: 32 lower-case hex digits; throws on anything else. */
export function reviewedChecksum(raw) {
  const sum = String(raw ?? '').trim().toLowerCase();
  if (!MD5.test(sum)) throw new Error('--checksum needs the dry run\'s checksum');
  return sum;
}

export const applySql = ({ ids, checksum }) => `-- teacher-phones backfill: APPLY ${ids.length} row(s).
begin;
do $$
declare
  wanted uuid[] := array[${ids.map((id) => `'${id}'`).join(', ')}]::uuid[];
  written int;
  free_ids uuid[];
  free_sum text;
begin
  ${CANDIDATES.replace(/\n/g, '\n  ')}
  select coalesce(array_agg(profile_id order by profile_id), '{}'), ${CHECKSUM}
    into free_ids, free_sum from free;
  if free_ids <> wanted or free_sum <> '${checksum}' then
    raise exception 'backfill: the rows to write differ from the reviewed list; nothing written';
  end if;
  update public.profiles p set phone_e164 = t.phone_e164
  from public.teachers t
  where t.profile_id = p.id and p.id = any(wanted) and p.phone_e164 is null;
  get diagnostics written = row_count;
  if written <> cardinality(wanted) then
    raise exception 'backfill: wrote % row(s), expected %', written, cardinality(wanted);
  end if;
end $$;
commit;
`;

export function parseArgs(argv) {
  const value = (name) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
  return { apply: argv.includes('--apply'), ids: value('ids'), checksum: value('checksum') };
}

/** The SQL for the arguments: the dry run unless --apply (with --ids and --checksum) is given. */
const applyOf = (args) =>
  applySql({ ids: reviewedIds(args.ids), checksum: reviewedChecksum(args.checksum) });
export const run = (args) => (args.apply ? applyOf(args) : DRY_RUN_SQL);

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(run(parseArgs(process.argv.slice(2))));
}
