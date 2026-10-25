import type { ReactNode } from 'react';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import type { Teacher } from './api';
import { meetingModeText } from './meeting-mode-text';

/** «البيانات» tab: the teacher record as label / value rows (R-TCH-01). Empty values are left out. */
export function TeacherFacts({ teacher }: { teacher: Teacher }) {
  const rows: [string, ReactNode][] = [
    [t.teachers.displayNameAr, teacher.display_name_ar],
    [t.teachers.displayNameEn, teacher.display_name_en && <Ltr>{teacher.display_name_en}</Ltr>],
    [t.teachers.gender, t.teachers.genderLabel[teacher.gender]],
    [t.teachers.programs, teacher.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator)],
    [t.teachers.phone, teacher.phone_e164 && <Ltr>{teacher.phone_e164}</Ltr>],
    [t.teachers.meetingLink, teacher.meeting_link && <bdi dir="ltr" className="break-all">{teacher.meeting_link}</bdi>],
    [t.teachers.meetingMode, meetingModeText(teacher.meeting_mode, teacher.platform_classroom)],
    [t.teachers.tz, <Ltr key="tz">{teacher.tz}</Ltr>],
    [t.teachers.maxStudents, teacher.max_students],
  ];
  return (
    <dl className="max-w-3xl text-sm">
      {rows
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 border-b border-rule py-2.5">
            <dt className="text-xs font-semibold text-ink-3">{label}</dt>
            <dd className="min-w-0 tabular-nums">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
