import { Button, FormAlert, t } from '@ab/web-kit';

export interface LoadRetryProps {
  /** Without it there is no retry (teacher_not_linked: only the admin can fix it). */
  onRetry?: (() => unknown) | undefined;
  text?: string;
}

/** Shown only when nothing is cached, so a failed 30 s poll never blanks a screen (docs/48). */
export function LoadRetry({ onRetry, text = t.teacherDash.loadError }: LoadRetryProps) {
  return (
    <FormAlert>
      {text}{' '}
      {onRetry && (
        <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
          {t.teacherStudents.retry}
        </Button>
      )}
    </FormAlert>
  );
}
