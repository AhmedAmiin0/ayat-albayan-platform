import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';

export interface LoadErrorProps {
  text: string;
  /** «حاول مرة أخرى»; absent when retrying cannot help (teacher_not_linked). */
  onRetry?: (() => unknown) | undefined;
}

/** The page's load error, shown only when nothing is cached (docs/48 load-state order). */
export function LoadError({ text, onRetry }: LoadErrorProps) {
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
