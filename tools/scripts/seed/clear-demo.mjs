// pnpm clear:demo [--apply] [--allow-remote-staging] — removes exactly the rows `pnpm seed:demo`
// writes (selection: clear-demo.plan.mjs). Dry-run by default: the deletes run in one transaction
// that is rolled back, so the counts are exact and a blocker shows up without touching data.
// --apply commits. Rows the app attached to demo people are never deleted or detached: NO ACTION
// FKs (lessons, rules, payments…) make the delete fail, and SET NULL dependents (messages, trial
// rules, applicants: SET_NULL_DEPENDENTS) are counted first. Either way it refuses and rolls back.
import postgres from 'postgres';
import {
  allowedTarget,
  DELETE_ORDER,
  demoSelection,
  SET_NULL_DEPENDENTS,
} from './clear-demo.plan.mjs';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing: run `pnpm env:local` (writes e2e/.env)');
if (!allowedTarget(url, process.argv)) {
  throw new Error('refusing to clear a non-local DB (staging needs --allow-remote-staging)');
}
const apply = process.argv.includes('--apply');

const DEMO_IDS = {
  leads: (tx, s) => tx`
    select id from public.leads
    where phone_e164 = any(${tx.array(s.leadPhones)}) and qualification ->> 'demo' = 'true'`,
  guardians: (tx, s) => tx`
    select id from public.guardians where phone_e164 = any(${tx.array(s.guardianPhones)}) and notes = ${s.note}`,
  teachers: (tx, s) => tx`
    select id from public.teachers
    where phone_e164 = any(${tx.array(s.teacherPhones)}) and display_name_en like ${`%${s.teacherNameSuffix}`}`,
};

/** The demo students' channels (migration 800): matched like every demo student row. */
const demoChannels = (tx, s) => tx`
  select c.id from public.student_channels c join public.students st on st.id = c.student_id
  join public.guardians g on g.id = st.guardian_id
  where st.notes = ${s.note} and g.phone_e164 || '|' || st.name = any(${tx.array(s.studentKeys)})`;

const DELETES = {
  job_applicants: (tx, s) => tx`
    delete from public.job_applicants
    where phone_e164 = any(${tx.array(s.applicantPhones)}) and notes = ${s.note} returning id`,
  leads: (tx, s) =>
    tx`delete from public.leads where id in (${DEMO_IDS.leads(tx, s)}) returning id`,
  student_assistants: (tx, s) => tx`
    delete from public.student_assistants sa using public.students st, public.guardians g
    where st.id = sa.student_id and g.id = st.guardian_id and st.notes = ${s.note}
      and g.phone_e164 || '|' || st.name = any(${tx.array(s.studentKeys)}) returning sa.student_id`,
  student_join_links: (tx, s) => tx`
    delete from public.student_join_links sl using public.students st, public.guardians g
    where st.id = sl.student_id and g.id = st.guardian_id and st.notes = ${s.note}
      and g.phone_e164 || '|' || st.name = any(${tx.array(s.studentKeys)}) returning sl.student_id`,
  channel_reads: (tx, s) => tx`
    delete from public.channel_reads where channel_id in (${demoChannels(tx, s)}) returning channel_id`,
  channel_messages: (tx, s) => tx`
    delete from public.channel_messages where channel_id in (${demoChannels(tx, s)}) returning id`,
  student_channels: (tx, s) => tx`
    delete from public.student_channels where id in (${demoChannels(tx, s)}) returning id`,
  students: (tx, s) => tx`
    delete from public.students st using public.guardians g
    where g.id = st.guardian_id and st.notes = ${s.note}
      and g.phone_e164 || '|' || st.name = any(${tx.array(s.studentKeys)}) returning st.id`,
  // The seed writes only the main numbers (the mirror trigger); a second number was linked in the app: refuse.
  guardian_phones: async (tx, s) => {
    const [{ n }] = await tx`
      select count(*)::int as n from public.guardian_phones
      where not is_primary and guardian_id in (${DEMO_IDS.guardians(tx, s)})`;
    if (n > 0) throw new Error(`${n} guardian_phones second number(s) of demo guardians would be deleted`);
    return tx`delete from public.guardian_phones where guardian_id in (${DEMO_IDS.guardians(tx, s)}) returning phone_e164`;
  },
  guardians: (tx, s) =>
    tx`delete from public.guardians where id in (${DEMO_IDS.guardians(tx, s)}) returning id`,
  teacher_time_off: (tx, s) => tx`
    delete from public.teacher_time_off where teacher_id in (${DEMO_IDS.teachers(tx, s)}) returning id`,
  teacher_availability: (tx, s) => tx`
    delete from public.teacher_availability where teacher_id in (${DEMO_IDS.teachers(tx, s)}) returning id`,
  teacher_thread_reads: (tx, s) => tx`
    delete from public.teacher_thread_reads where teacher_id in (${DEMO_IDS.teachers(tx, s)}) returning teacher_id`,
  teachers: (tx, s) =>
    tx`delete from public.teachers where id in (${DEMO_IDS.teachers(tx, s)}) returning id`,
};

/** Runs before `table` is deleted; demo applicants are already gone (DELETE_ORDER), real ones count. */
async function refuseDetaching(tx, table, s) {
  for (const d of SET_NULL_DEPENDENTS.filter((x) => x.parent === table)) {
    const [{ n }] = await tx`
      select count(*)::int as n from ${tx(`public.${d.table}`)}
      where ${tx(d.column)} in (${DEMO_IDS[table](tx, s)})`;
    if (n > 0)
      throw new Error(
        `${n} ${d.table}.${d.column} row(s) point at demo ${table} and would be detached`,
      );
  }
}

class DryRun extends Error {}

const sql = postgres(url, { max: 1, onnotice: () => undefined });
const counts = {};
try {
  await sql.begin(async (tx) => {
    const selection = demoSelection();
    for (const table of DELETE_ORDER) {
      await refuseDetaching(tx, table, selection);
      counts[table] = (await DELETES[table](tx, selection)).length;
    }
    if (!apply) throw new DryRun();
  });
} catch (e) {
  if (!(e instanceof DryRun)) {
    console.error(`clear:demo refused, nothing deleted: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
if (process.exitCode !== 1) {
  const summary = DELETE_ORDER.map((t) => `${t}=${counts[t]}`).join(', ');
  console.log(
    apply ? `DEMO rows deleted: ${summary}` : `dry-run (pass --apply to delete): ${summary}`,
  );
}
