import { attended, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { LessonFilesLink } from '@/core/nav/LessonFilesLink';
import { useV2Entry } from '@/teacher/report/v2/hooks/use-v2-entry';
import { AbsentCard } from '@/teacher/report/v2/sections/AbsentCard';
import { ArabicSection } from '@/teacher/report/v2/sections/ArabicSection';
import { AttendanceProgram } from '@/teacher/report/v2/sections/AttendanceProgram';
import { FamilyNoteCard } from '@/teacher/report/v2/sections/FamilyNoteCard';
import { HomeworkCard } from '@/teacher/report/v2/sections/HomeworkCard';
import { IslamicSection } from '@/teacher/report/v2/sections/IslamicSection';
import { NextPlanCard } from '@/teacher/report/v2/sections/NextPlanCard';
import { OverallCard } from '@/teacher/report/v2/sections/OverallCard';
import { QuranSection } from '@/teacher/report/v2/sections/QuranSection';
import { V2Footer } from '@/teacher/report/v2/V2Footer';
import { V2Header } from '@/teacher/report/v2/V2Header';

interface ReportEntryCardV2Props {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  /** The teacher's zone for the save line and the edit window. */
  tz: string;
}

/** The new report form (form_version 2, docs/design/report-form). */
export function ReportEntryCardV2({ form, entry, tz }: ReportEntryCardV2Props) {
  const s = useV2Entry(entry);
  const { attendance, program } = s.values;
  // Not chosen yet: the attended form, so the teacher sees what is asked.
  const present = attendance === null || attended(attendance);
  return (
    <View
      accessibilityLabel={t.reports.entryFor.replace('{name}', entry.student.name)}
      style={{ gap: 14 }}
    >
      <V2Header lesson={form.lesson} entry={entry} />
      <AttendanceProgram s={s} />
      {present ? (
        <>
          {program === 'quran' ? <QuranSection s={s} /> : null}
          {program === 'arabic' ? <ArabicSection s={s} /> : null}
          {program === 'islamic_studies' ? <IslamicSection s={s} /> : null}
          <OverallCard s={s} />
          <HomeworkCard s={s} />
          <NextPlanCard s={s} />
          <FamilyNoteCard s={s} />
          <LessonFilesLink lessonId={form.lesson.id} admin={false} />
        </>
      ) : (
        <AbsentCard s={s} />
      )}
      <V2Footer s={s} block={form.submit_block} tz={tz} />
    </View>
  );
}
