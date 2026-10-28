import { attended, type ReportFormEntry, type ReportFormResponse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
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

/**
 * One student's new «تقرير الحلقة» (form_version 2, docs/design/report-form): الحضور and البرنامج,
 * then either the absent card or the program's content (Quran parts by surah and ayah, Arabic
 * skills, Islamic studies), the overall grade, homework, next lesson and the note to the family.
 */
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
        </>
      ) : (
        <AbsentCard s={s} />
      )}
      <V2Footer s={s} block={form.submit_block} tz={tz} />
    </View>
  );
}
