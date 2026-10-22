import { describe, expect, it } from 'vitest';
import { calendarTeacher, suggestCalendar, suggestFolder } from './suggest';

const CALS = [
  { id: 'cal-mariam@group.calendar.google.com', name: 'آيات البيان — Mariam Adel' },
  { id: 'cal-sara@group.calendar.google.com', name: 'آيات البيان — سارة أحمد' },
  { id: 'primary', name: 'academy@example.test' },
];

describe('teacher ↔ calendar suggestions', () => {
  it('reads the teacher part of «آيات البيان — <teacher>»', () => {
    expect(calendarTeacher('آيات البيان — Mariam Adel')).toBe('mariam adel');
    expect(calendarTeacher('Personal')).toBeNull();
  });

  it('prefers the imported calendar id, then the Latin or Arabic name', () => {
    expect(suggestCalendar({ display_name_ar: 'مريم', display_name_en: null, google_calendar_id: 'cal-mariam@group.calendar.google.com' }, CALS)?.id).toBe('cal-mariam@group.calendar.google.com');
    expect(suggestCalendar({ display_name_ar: 'مريم عادل', display_name_en: 'mariam  adel', google_calendar_id: null }, CALS)?.id).toBe('cal-mariam@group.calendar.google.com');
    expect(suggestCalendar({ display_name_ar: 'ساره احمد', display_name_en: null, google_calendar_id: null }, CALS)?.id).toBe('cal-sara@group.calendar.google.com');
    expect(suggestCalendar({ display_name_ar: 'هدى', display_name_en: 'Huda', google_calendar_id: 'gone@group' }, CALS)).toBeNull();
  });
});

describe('student ↔ folder suggestions', () => {
  const links = [
    { name: 'أحمد محمد', folderId: 'F1_ABCDEFGHIJ', sheetId: 'S1_ABCDEFGHIJ' },
    { name: 'فاطمة', folderId: 'F2_ABCDEFGHIJ', sheetId: null },
    { name: 'فاطمه', folderId: 'F3_ABCDEFGHIJ', sheetId: null },
  ];

  it('matches by the normalised Arabic name', () => {
    expect(suggestFolder('احمد مُحمد', links)?.folderId).toBe('F1_ABCDEFGHIJ');
  });

  it('suggests nothing when two folders share the name', () => {
    expect(suggestFolder('فاطمة', links)).toBeNull();
    expect(suggestFolder('سارة', links)).toBeNull();
  });
});
