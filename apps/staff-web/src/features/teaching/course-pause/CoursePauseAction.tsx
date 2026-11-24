import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { coursePauseQuery } from './api';
import { CoursePauseSheet } from './CoursePauseSheet';

interface CoursePauseActionProps {
  studentId: string;
  /** The head's overflow menu hides its children on phones, so the page shows the toast. */
  onDone: (message: string) => void;
  hint?: string;
}

/** Only with courses.pause and while no pause is open. */
export function CoursePauseAction({ studentId, onDone, hint }: CoursePauseActionProps) {
  const { can } = usePermissions();
  const allowed = can('courses.pause');
  const state = useQuery({ ...coursePauseQuery(studentId), enabled: allowed });
  const [sheet, setSheet] = useState(false);
  const offered = allowed && state.isSuccess && !state.data.open;
  return (
    <>
      {offered && (
        <div className="grid justify-items-start gap-1">
          <Button type="button" variant="secondary" onClick={() => setSheet(true)}>
            {t.coursePause.action}
          </Button>
          {hint && <p className="text-xs text-ink-3">{hint}</p>}
        </div>
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
