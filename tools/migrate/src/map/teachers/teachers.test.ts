// teachers module on invented phones/links and the invented teacher directory (test-setup.ts).
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import { bundleOf, row } from '../../sources/sheets/fixtures.ts';
import { setTeacherDirectory, teacherDirectory } from '../../sources/teachers.dir.ts';
import { TEST_TEACHERS } from '../../test-setup.ts';
import { mapTeachers, meetingLink } from './teachers.ts';

const t = (fields: Record<string, string | number | null>) =>
  row({
    legacy_id: 'M-01',
    name_en: 'Mariam Adel',
    phone: 201011110001,
    gender: 'معلمة',
    specialty: 'تحفيظ وتجويد',
    status: 'نشط',
    meeting_link: 'meet.google.com/abc-defg-hij',
    ...fields,
  });

describe('teachers', () => {
  it('maps a registry row with its Arabic name, E.164 phone, link and calendar', () => {
    const [m] = mapTeachers(
      bundleOf({
        hub_teachers: [t({})],
        book_teachers: [row({ name_en: 'Mariam Adel', google_calendar_id: 'cal-1@group' })],
      }),
    );
    expect(m).toMatchObject({
      ok: true,
      key: keys.teacher('mariam adel'),
      value: {
        columns: {
          display_name_ar: 'مريم عادل',
          display_name_en: 'Mariam Adel',
          gender: 'female',
          programs: ['quran'],
          phone_e164: '+201011110001',
          meeting_link: 'https://meet.google.com/abc-defg-hij',
          status: 'active',
          tz: 'Africa/Cairo',
          google_calendar_id: 'cal-1@group',
        },
      },
    });
  });

  it('takes slugs and Arabic names only from the directory (none built in)', () => {
    setTeacherDirectory({ names: {}, aliases: {} });
    expect(mapTeachers(bundleOf({ hub_teachers: [t({})] }))[0]?.ok).toBe(false);
    setTeacherDirectory(TEST_TEACHERS);
    expect(teacherDirectory().names['mariam adel']).toBe('مريم عادل');
  });

  it('rejects unknown names and genders, warns on a bad phone', () => {
    const [unknown, noGender, badPhone] = mapTeachers(
      bundleOf({ hub_teachers: [t({ name_en: 'Ahmed' }), t({ gender: 'x' }), t({ phone: '12' })] }),
    );
    expect(unknown).toMatchObject({ ok: false, issues: [{ code: 'unknown_teacher' }] });
    expect(noGender).toMatchObject({
      ok: false,
      issues: [{ code: 'unmapped_value', field: 'gender' }],
    });
    expect(badPhone).toMatchObject({
      ok: true,
      value: { columns: { phone_e164: null } },
      issues: [{ code: 'bad_phone', severity: 'warn' }],
    });
  });

  it('meetingLink adds the scheme and drops non-links', () => {
    expect(meetingLink('https://us06web.zoom.us/j/123?pwd=x')).toBe(
      'https://us06web.zoom.us/j/123?pwd=x',
    );
    expect(meetingLink('meet.google.com/abc-defg-hij')).toBe(
      'https://meet.google.com/abc-defg-hij',
    );
    expect(meetingLink('Zoom')).toBeNull();
    expect(meetingLink('أونلاين')).toBeNull();
    expect(meetingLink(null)).toBeNull();
  });
});
