// pnpm clear:demo [--apply] [--allow-remote-staging] — removes exactly the rows `pnpm seed:demo`
// writes (selection: clear-demo.plan.mjs). Dry-run by default: the deletes run in one transaction
// that is rolled back, so the counts are exact and an FK blocker shows up without touching data.
// --apply commits. Rows the app attached to demo people (lessons, rules, payments…) are never
// deleted: the delete is refused and rolled back, naming the blocking constraint.
import postgres from 'postgres';
import { allowedTarget, DELETE_ORDER, demoSelection } from './clear-demo.plan.mjs';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL missing: run `pnpm env:local` (writes e2e/.env)');
if (!allowedTarget(url, process.argv)) {
  throw new Error('refusing to clear a non-local DB (staging needs --allow-remote-staging)');
}
const apply = process.argv.includes('--apply');

const demoTeachers = (tx, s) => tx`
  select id from public.teachers
  where phone_e164 = any(${tx.array(s.teacherPhones)}) and display_name_en like ${`%${s.teacherNameSuffix}`}`;

const DELETES = {
  job_applicants: (tx, s) => tx`
    delete from public.job_applicants
    where phone_e164 = any(${tx.array(s.applicantPhones)}) and notes = ${s.note} returning id`,
  leads: (tx, s) => tx`
    delete from public.leads
    where phone_e164 = any(${tx.array(s.leadPhones)}) and qualification ->> 'demo' = 'true' returning id`,
  students: (tx, s) => tx`
    delete from public.students st using public.guardians g
    where g.id = st.guardian_id and st.notes = ${s.note}
      and g.phone_e164 || '|' || st.name = any(${tx.array(s.studentKeys)}) returning st.id`,
  guardians: (tx, s) => tx`
    delete from public.guardians
    where phone_e164 = any(${tx.array(s.guardianPhones)}) and notes = ${s.note} returning id`,
  teacher_time_off: (tx, s) => tx`
    delete from public.teacher_time_off where teacher_id in (${demoTeachers(tx, s)}) returning id`,
  teacher_availability: (tx, s) => tx`
    delete from public.teacher_availability where teacher_id in (${demoTeachers(tx, s)}) returning id`,
  teachers: (tx, s) => tx`
    delete from public.teachers where id in (${demoTeachers(tx, s)}) returning id`,
};

class DryRun extends Error {}

const sql = postgres(url, { max: 1, onnotice: () => undefined });
const counts = {};
try {
  await sql.begin(async (tx) => {
    const selection = demoSelection();
    for (const table of DELETE_ORDER) counts[table] = (await DELETES[table](tx, selection)).length;
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
  console.log(apply ? `DEMO rows deleted: ${summary}` : `dry-run (pass --apply to delete): ${summary}`);
}
