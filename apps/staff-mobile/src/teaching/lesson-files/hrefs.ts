import type { Href } from 'expo-router';

const enc = encodeURIComponent;

/** «ملفات الحلقة» in the admin's students tab, or under the teacher's reports. */
export const lessonFilesHref = (input: { lessonId: string; admin: boolean }): Href =>
  input.admin
    ? `/students/lesson-files/${enc(input.lessonId)}`
    : `/teacher/reports/student/lesson-files/${enc(input.lessonId)}`;
