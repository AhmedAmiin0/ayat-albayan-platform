import { REPORT_RUBRICS } from '../../rules';

export const REPORT_ID = '6f1c2b0e-8a4d-4c1e-9b7a-3d2e1f0a9b8c';
const OTHER_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

export const REPORT_VIEW = {
  id: REPORT_ID,
  lesson_id: OTHER_ID,
  student_id: OTHER_ID,
  teacher_id: OTHER_ID,
  attendance: 'on_time',
  program: 'quran',
  recited: null,
  new_memorization: null,
  revision: null,
  theory: null,
  grades: Object.fromEntries(REPORT_RUBRICS.map((r) => [r, null])),
  grade_overall: null,
  notes: null,
  homework: null,
  next_plan: null,
  status: 'draft',
  version: 0,
  submitted_at: null,
  edited_at: null,
  pdf_status: null,
  pdf_error: null,
  sent_at: null,
  attachments: [
    {
      id: OTHER_ID,
      storage_path: 'r/a.png',
      mime: 'image/png',
      size: 10,
      created_at: '2026-11-20T17:00:00Z',
    },
  ],
  can_edit: true,
  edit_until: null,
  form_version: 1,
  content: null,
};
