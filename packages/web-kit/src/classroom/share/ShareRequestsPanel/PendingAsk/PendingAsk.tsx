import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { REQUEST_TEXT } from '@ab/web-kit/classroom/share/request-text';
import type { PendingAskProps } from './PendingAsk.types';

export function PendingAsk({ share, ask }: PendingAskProps) {
  const words = t.classroom.shareRequest;
  const question = REQUEST_TEXT[ask.what].asks.replace('{name}', ask.tile.name);
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-md border border-lapis bg-lapis-wash px-3 py-1.5 text-sm"
    >
      <span>{question}</span>
      <Button type="button" size="sm" onClick={() => share.allow(ask)}>
        {words.allow}
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => share.deny(ask)}>
        {words.deny}
      </Button>
    </div>
  );
}
