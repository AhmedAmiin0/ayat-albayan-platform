import { formatPhone, normalizePhone } from '@ab/core';
import { HighlightDiff } from '@ab/web-kit/components/ui/display/highlight-diff';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { nameMatch, textMatch } from './compare';
import type { CreateStudentValues } from '@/features/people/students/create/create-student';
import { CompareRow, cell } from './CompareRow';
import type { StudentProfile, StudentRef } from '@ab/shared';

type DuplicateCompareProps = {
  typed: CreateStudentValues;
  candidate: StudentRef;
  /** The candidate's profile; undefined while loading (or if it failed). */
  profile: StudentProfile | undefined;
};

const sub = 'w-full text-2xs font-normal text-ink-3';

/** docs/07 §6 Dialog, R-STU-03: on phones two value columns with the field as row header. */
export function DuplicateCompare({ typed, candidate, profile }: DuplicateCompareProps) {
  const phone = normalizePhone(typed.guardianPhone);
  const e164 = phone.ok ? phone.e164 : typed.guardianPhone;
  const teacher = profile?.teacher && teacherLabel(profile.teacher);

  return (
    <div
      role="table"
      aria-label={t.students.duplicateCandidates}
      className="grid grid-cols-2 overflow-hidden rounded-md border border-rule text-xs sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_150px] sm:text-sm"
    >
      <div role="row" className="contents">
        <span role="columnheader" className={`${cell.head} max-sm:hidden`} />
        <span role="columnheader" className={cell.head}>{t.students.compareNow}</span>
        <span role="columnheader" className={`${cell.head} ${cell.existing}`}>
          <span>
            {t.students.compareExisting} <Ltr className="text-ink-2">{candidate.code}</Ltr>
          </span>
        </span>
        <span role="columnheader" className={`${cell.head} max-sm:hidden`}>{t.students.compareResult}</span>
      </div>
      <CompareRow
        label={t.students.name}
        now={<HighlightDiff text={typed.name} against={candidate.name} />}
        existing={<HighlightDiff text={candidate.name} against={typed.name} />}
        match={nameMatch(typed.name, candidate.name)}
        large
      />
      <CompareRow
        label={t.students.guardianPhone}
        now={
          <>
            <Ltr>{typed.guardianPhone}</Ltr>
            {e164 !== typed.guardianPhone && (
              <small className={sub}>
                {t.students.normalized} <Ltr>{formatPhone(e164)}</Ltr>
              </small>
            )}
          </>
        }
        existing={<Ltr>{formatPhone(profile?.guardian.phone_e164 ?? e164)}</Ltr>}
        match="phone"
      />
      <CompareRow
        label={t.students.guardian}
        now={<span>{typed.guardianName}</span>}
        existing={profile && <span>{profile.guardian.name}</span>}
        match={profile && textMatch(typed.guardianName, profile.guardian.name)}
      />
      <CompareRow
        label={t.students.program}
        now={<span>{t.enums.program[typed.program]}</span>}
        existing={
          profile && (
            <>
              <span>{t.enums.program[profile.program]}</span>
              {teacher && <small className={sub}>{t.students.withTeacher.replace('{teacher}', teacher)}</small>}
            </>
          )
        }
        match={profile && (profile.program === typed.program ? 'same' : 'differs')}
        last
      />
    </div>
  );
}
