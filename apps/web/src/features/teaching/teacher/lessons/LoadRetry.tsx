import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

/**
 * The teacher lessons' load error with «حاول مرة أخرى» (docs/48 load-state order): shown only
 * when nothing is cached, so a failed 30 s poll never blanks a good screen.
 */
export function LoadRetry({ onRetry }: { onRetry: () => unknown }) {
  return (
    <FormAlert>
      {t.teacherDash.loadError}{' '}
      <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
        {t.teacherStudents.retry}
      </Button>
    </FormAlert>
  );
}
