import { attended, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { LessonFilesLink } from '@/core/nav/LessonFilesLink';
import { useV2Entry } from './hooks/use-v2-entry';
import { AbsentCard } from './sections/AbsentCard';
import { ArabicSection } from './sections/ArabicSection';
import { AttendanceProgram } from './sections/AttendanceProgram';
import { FamilyNoteCard } from './sections/FamilyNoteCard';
import { HomeworkCard } from './sections/HomeworkCard';
import { IslamicSection } from './sections/IslamicSection';
import { NextPlanCard } from './sections/NextPlanCard';
import { OverallCard } from './sections/OverallCard';
import { QuranSection } from './sections/QuranSection';
import { V2Footer } from './V2Footer';
import { V2Header } from './V2Header';

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
