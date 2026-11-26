import { formatClock } from '@ab/client-core';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { IconButton } from '@ab/web-kit/components/ui/form/IconButton';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const m = t.studentChannel.media;

interface Props {
  seconds: number;
  onCancel: () => void;
}

/** The pulsing dot is the only loop, a live sign, and none under reduced motion. */
export function RecordingBar({ seconds, onCancel }: Props) {
  return (
    <div className="flex min-h-12 flex-1 animate-fade-in items-center gap-2.5 rounded-full border border-rule-input bg-raised ps-4 pe-1">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-danger motion-safe:animate-pulse" />
      <Ltr className="text-sm font-bold">{formatClock(seconds)}</Ltr>
      <span role="status" className="min-w-0 flex-1 truncate text-xs text-ink-2">
        {m.recording}
      </span>
      <IconButton label={m.cancel} onClick={onCancel} className="ab-press rounded-full text-danger">
        <Icon name="x" />
      </IconButton>
    </div>
  );
}
