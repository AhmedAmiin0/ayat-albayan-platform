import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

export interface LoadRetryProps {
  /** Without it, no «حاول مرة أخرى» (teacher_not_linked: only the admin can fix it). */
  onRetry?: (() => unknown) | undefined;
  text?: string;
}

/**
 * A teacher screen's load error with «حاول مرة أخرى» (docs/48 load-state order): shown only when
 * nothing is cached, so a failed 30 s poll never blanks a good screen.
 */
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
