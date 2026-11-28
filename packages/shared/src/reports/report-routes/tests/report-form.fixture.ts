import { REPORT_VIEW } from './report-view.fixture';

const LESSON_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

export const MEMORY = {
  last: { recited: { surah: 78, from: 1, to: 16 }, new: null, revision: null },
  recent_surahs: [78, 79],
};

export const FORM = {
  lesson: {
    id: LESSON_ID,
    starts_at: '2026-11-20T17:00:00.000Z',
    ends_at: '2026-11-20T17:30:00.000Z',
    status: 'scheduled',
    meeting_link: null,
    teacher: { id: LESSON_ID, display_name_ar: 'معلم', display_name_en: null, tz: 'Africa/Cairo' },
  },
  entries: [
    {
      student: {
        id: LESSON_ID,
        code: 'AB-0201',
        name: 'طالب',
        tz: 'Africa/Cairo',
        program: 'quran',
      },
      lesson_no: 4,
      package: {
        subscription_id: LESSON_ID,
        lessons_total: 8,
        lessons_used: 3,
        remaining: 5,
        ended_at: null,
        projected_end_at: null,
      },
      report: REPORT_VIEW,
      memory: MEMORY,
    },
  ],
  submit_block: null,
};
