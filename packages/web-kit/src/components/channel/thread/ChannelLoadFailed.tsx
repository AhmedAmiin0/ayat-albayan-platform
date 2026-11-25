import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  onRetry: () => void;
  /** A refetch failed while the thread is shown: one small line, the thread and draft stay. */
  inline?: boolean;
}

/** The whole state before any data, else a line. */
export function ChannelLoadFailed({ onRetry, inline = false }: Props) {
  const retry = (
    <Button type="button" variant={inline ? 'ghost' : 'secondary'} size="sm" onClick={onRetry}>
      {t.studentChannel.retry}
    </Button>
  );
  if (!inline) {
    return (
      <FormAlert>
        {t.studentChannel.loadFailed} {retry}
      </FormAlert>
    );
  }
  return (
    <p role="alert" className="flex flex-wrap items-center gap-2 text-2xs text-destructive">
      {t.studentChannel.loadFailed}
      {retry}
    </p>
  );
}
