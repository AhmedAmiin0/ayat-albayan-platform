import { Button, FormAlert } from '#/components/ui/index.ts';
import { t } from '#/lib/i18n/index.ts';

interface Props {
  onRetry: () => void;
  /** A refetch failed while the thread is shown: one small line, the thread and draft stay. */
  inline?: boolean;
}

/** «تعذر تحميل المحادثة» with «حاول مرة أخرى»: the whole state before any data, else a line. */
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
