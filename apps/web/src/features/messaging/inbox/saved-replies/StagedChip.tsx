import { Button } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { sizeText } from '@/features/people/students/recordings/recording-format';
import { t } from '@/lib/i18n/i18n';
import { sendErrorCodeText } from '../composer/lib/send-error';
import type { Staged } from './staged-store';

const S = t.savedReplies;

/** A failed attempt's reason: the reply deleted meanwhile, or the chat's own file-send reason. */
const reasonText = (code: string): string =>
  code === 'saved_reply_not_found' || code === 'saved_replies_forbidden' ? S.errors[code] : sendErrorCodeText(code);

export interface StagedChipProps {
  staged: Staged;
  pending: boolean;
  onRemove: () => void;
  onRetry: () => void;
}

/** The picked reply's file above the box: «يُرسل بعد النص», removable; after a failure, why and a retry. */
export function StagedChip({ staged, pending, onRemove, onRetry }: StagedChipProps) {
  const { attachment, failed } = staged;
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-rule bg-sunk px-2 py-1 text-xs text-ink-2">
          <Icon name={attachment.mime === 'application/pdf' ? 'template' : 'paperclip'} className="size-5" />
          <span className="min-w-0 truncate font-semibold" dir="auto">{attachment.name}</span>
          <span className="shrink-0 text-ink-3">{sizeText(attachment.size)}</span>
          <span className="shrink-0 text-ink-3">· {S.staged}</span>
        </span>
        <IconButton label={S.stagedRemove.replace('{name}', attachment.name)} disabled={pending} className="rounded-full" onClick={onRemove}>
          <Icon name="x" className="size-5" />
        </IconButton>
      </div>
      {failed && (
        <p role="alert" className="flex flex-wrap items-center gap-1.5 text-xs text-danger">
          <NuqtaGlyph shape="struck" />
          <span>{S.web.fileFailed.replace('{reason}', reasonText(failed))}</span>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onRetry}>
            {S.web.retryFile}
          </Button>
        </p>
      )}
    </div>
  );
}
