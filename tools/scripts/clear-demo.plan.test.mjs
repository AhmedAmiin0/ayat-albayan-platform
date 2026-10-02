import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedTarget, DELETE_ORDER, demoSelection, STAGING_REF, studentKey } from './clear-demo.plan.mjs';
import { APPLICANTS, DEMO_NOTE, FAMILIES, LEADS, TEACHERS } from './seed-demo.data.mjs';

const E164 = /^\+[1-9]\d{6,14}$/;
const local = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const staging = `postgresql://postgres.${STAGING_REF}:pw@aws-0-eu.pooler.supabase.com:6543/postgres`;
const prod = 'postgresql://postgres.otherprojectref:pw@aws-0-eu.pooler.supabase.com:6543/postgres';

test('selects every row the seed writes, by the same phones it upserts on', () => {
  const s = demoSelection();
  assert.deepEqual(s.teacherPhones, TEACHERS.map((t) => t.phone));
  assert.deepEqual(s.guardianPhones, FAMILIES.map((f) => f.phone));
  assert.deepEqual(s.leadPhones, LEADS.map((l) => l.phone));
  assert.deepEqual(s.applicantPhones, APPLICANTS.map((a) => a.phone));
  const students = FAMILIES.reduce((n, f) => n + f.students.length, 0);
  assert.equal(s.studentKeys.length, students);
  for (const phone of [...s.teacherPhones, ...s.guardianPhones, ...s.leadPhones, ...s.applicantPhones]) {
    assert.match(phone, E164);
  }
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
  const before = (a, b) => assert.ok(DELETE_ORDER.indexOf(a) < DELETE_ORDER.indexOf(b), `${a} < ${b}`);
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
