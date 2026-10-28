import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { coursePauseQuery } from './api';
import { CoursePauseSheet } from './CoursePauseSheet';

interface CoursePauseActionProps {
  studentId: string;
  /** «أُوقفت الدورة مؤقتًا»: the page's toast (the head's «⋯» menu hides its children on phones). */
  onDone: (message: string) => void;
}

/** «إيقاف مؤقت» in the student file's head: only with courses.pause and while no pause is open. */
export function CoursePauseAction({ studentId, onDone }: CoursePauseActionProps) {
  const { can } = usePermissions();
  const allowed = can('courses.pause');
  const state = useQuery({ ...coursePauseQuery(studentId), enabled: allowed });
  const [sheet, setSheet] = useState(false);
  const offered = allowed && state.isSuccess && !state.data.open;
  return (
    <>
      {offered && (
        <Button type="button" variant="secondary" onClick={() => setSheet(true)}>
          {t.coursePause.action}
        </Button>
      )}
      {sheet && (
        <CoursePauseSheet
          studentId={studentId}
          onClose={() => setSheet(false)}
          onDone={(message) => {
            setSheet(false);
            onDone(message);
          }}
        />
      )}
    </>
  );
}
