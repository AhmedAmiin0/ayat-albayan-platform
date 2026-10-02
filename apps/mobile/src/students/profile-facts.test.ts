import { t } from '@/lib/i18n';
import { profileFacts } from './profile-facts';
import { profile as base } from './test-data';

test('program, tz and «no teacher» when everything else is empty', () => {
  expect(profileFacts({ ...base, level: '  ', goal: '' })).toEqual([
    { label: t.students.program, value: t.enums.program.quran },
    { label: t.students.tz, value: 'Asia/Riyadh', ltr: true },
    { label: t.students.teacher, value: t.students.noTeacher },
  ]);
});

test('the form’s age and gender lead the facts; unknown ones are left out', () => {
  const facts = profileFacts({ ...base, age: 9, gender: 'female' });
  expect(facts.slice(0, 3)).toEqual([
    { label: t.students.age, value: '9' },
    { label: t.students.gender, value: t.enums.gender.female },
    { label: t.students.program, value: t.enums.program.quran },
  ]);
  expect(profileFacts({ ...base, age: null, gender: null })[0]?.label).toBe(t.students.program);
});

test('filled fields appear in form order, trimmed', () => {
  const teacher = { id: 't1', display_name_ar: 'أ. منى', meeting_link: null };
  const facts = profileFacts({ ...base, riwaya: 'حفص', level: ' مبتدئ ', memorized: 'جزء عم', teacher });
  expect(facts.map((f) => f.label)).toEqual([
    t.students.program,
    t.students.level,
    t.students.memorized,
    t.students.riwaya,
    t.students.tz,
    t.students.teacher,
  ]);
  expect(facts[1]?.value).toBe('مبتدئ');
  expect(facts.at(-1)?.value).toBe('أ. منى');
});
