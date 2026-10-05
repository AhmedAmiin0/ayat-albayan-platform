import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  allowedTarget,
  DELETE_ORDER,
  DEMO_DATA,
  demoSelection,
  STAGING_REF,
  studentKey,
} from './clear-demo.plan.mjs';
import { DEMO_NOTE, TEACHERS } from './seed-demo.data.mjs';
import { TEST_FAMILY, TEST_TEACHER } from './seed-test-account.data.mjs';

const { APPLICANTS, FAMILIES, LEADS } = DEMO_DATA;

const E164 = /^\+[1-9]\d{6,14}$/;
const local = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const staging = `postgresql://postgres.${STAGING_REF}:pw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres`;
const stagingDirect = `postgresql://postgres:pw@db.${STAGING_REF}.supabase.co:5432/postgres`;
const prod =
  'postgresql://postgres.otherprojectref:pw@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

test('selects every row the seed writes, by the same phones it upserts on', () => {
  const s = demoSelection();
  assert.deepEqual(
    s.teacherPhones,
    DEMO_DATA.TEACHERS.map((t) => t.phone),
  );
  assert.deepEqual(
    s.guardianPhones,
    FAMILIES.map((f) => f.phone),
  );
  assert.deepEqual(
    s.leadPhones,
    LEADS.map((l) => l.phone),
  );
  assert.deepEqual(
    s.applicantPhones,
    APPLICANTS.map((a) => a.phone),
  );
  const students = FAMILIES.reduce((n, f) => n + f.students.length, 0);
  assert.equal(s.studentKeys.length, students);
  for (const phone of [
    ...s.teacherPhones,
    ...s.guardianPhones,
    ...s.leadPhones,
    ...s.applicantPhones,
  ]) {
    assert.match(phone, E164);
  }
});

test('also selects the staging test account (seed-test-account.mjs)', () => {
  const s = demoSelection();
  assert.deepEqual(DEMO_DATA.TEACHERS.slice(0, TEACHERS.length), TEACHERS);
  assert.ok(s.teacherPhones.includes(TEST_TEACHER.phone));
  assert.ok(TEST_TEACHER.en.endsWith(s.teacherNameSuffix));
  assert.ok(s.guardianPhones.includes(TEST_FAMILY.phone));
  assert.ok(s.studentKeys.includes(studentKey(TEST_FAMILY.phone, TEST_FAMILY.student.name)));
  assert.equal(TEST_FAMILY.note, s.note);
});

test('carries the seed markers, so a real row sharing a phone is never selected', () => {
  const s = demoSelection();
  assert.equal(s.note, DEMO_NOTE);
  assert.equal(s.teacherNameSuffix, ' (DEMO)');
});

test('a student is keyed by its own guardian, not by name alone', () => {
  const data = {
    TEACHERS: [],
    LEADS: [],
    APPLICANTS: [],
    FAMILIES: [
      { phone: '+966500000001', students: [{ name: 'مريم' }] },
      { phone: '+966500000002', students: [{ name: 'مريم' }, { name: 'سارة' }] },
    ],
  };
  assert.deepEqual(demoSelection(data).studentKeys, [
    studentKey('+966500000001', 'مريم'),
    studentKey('+966500000002', 'مريم'),
    studentKey('+966500000002', 'سارة'),
  ]);
});

test('deletes children before the rows they point at', () => {
  const before = (a, b) =>
    assert.ok(DELETE_ORDER.indexOf(a) < DELETE_ORDER.indexOf(b), `${a} < ${b}`);
  before('leads', 'guardians');
  before('students', 'guardians');
  before('students', 'teachers');
  before('teacher_time_off', 'teachers');
  before('teacher_availability', 'teachers');
  assert.equal(new Set(DELETE_ORDER).size, DELETE_ORDER.length);
});

test('local always; staging only with --allow-remote-staging; anything else never', () => {
  assert.equal(allowedTarget(local, []), true);
  assert.equal(allowedTarget('postgres://u:p@localhost/db', []), true);
  assert.equal(allowedTarget(staging, []), false);
  assert.equal(allowedTarget(staging, ['--allow-remote-staging']), true);
  assert.equal(allowedTarget(prod, ['--allow-remote-staging', '--apply']), false);
  assert.equal(allowedTarget('postgres://u:p@evil.com/localhost', []), false);
});

test('target is judged on the parsed host and user, never on text elsewhere in the URL', () => {
  const flag = ['--allow-remote-staging'];
  assert.equal(allowedTarget('postgresql://postgres:pw@[::1]:54322/postgres', []), true);
  assert.equal(allowedTarget(stagingDirect, flag), true);
  assert.equal(allowedTarget(stagingDirect, []), false);
  // the staging ref in the query string, password, path or another user's name is not staging
  assert.equal(
    allowedTarget(
      `postgresql://postgres:pw@db.otherref.supabase.co:5432/postgres?application_name=${STAGING_REF}`,
      flag,
    ),
    false,
  );
  assert.equal(
    allowedTarget(
      `postgresql://postgres:${STAGING_REF}@db.otherref.supabase.co:5432/${STAGING_REF}`,
      flag,
    ),
    false,
  );
  assert.equal(
    allowedTarget(
      `postgresql://postgres.otherref:pw@db.${STAGING_REF}.supabase.co.evil.com:5432/postgres`,
      flag,
    ),
    false,
  );
  // "@localhost:" or "@127.0.0.1/" in the query string is not a local host
  assert.equal(
    allowedTarget('postgresql://u:p@db.prodref.supabase.co:5432/postgres?x=@localhost:1', []),
    false,
  );
  assert.equal(
    allowedTarget('postgresql://u:p@db.prodref.supabase.co:5432/postgres?x=@127.0.0.1/', []),
    false,
  );
  assert.equal(allowedTarget('postgres://u:p@localhost.evil.com:5432/db', []), false);
  assert.equal(allowedTarget('not a url @localhost:5432', []), false);
});
