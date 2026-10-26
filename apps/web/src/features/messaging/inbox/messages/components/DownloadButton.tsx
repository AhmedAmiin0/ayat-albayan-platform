import type { MessageView } from '@ab/shared';
import { Icon } from '@/components/ui/display/icon';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useBubbleTools } from '../lib/use-bubble-tools';

/** «تنزيل» under an opened file (the thumbnail, the PDF link, the player): saves it under its name. */
export function DownloadButton({ message: m, name }: { message: MessageView; name: string }) {
  const tools = useBubbleTools();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="-ms-3 w-fit"
        aria-label={t.inbox.download.label.replace('{name}', name)}
        onClick={() => tools.download(m)}
      >
        <Icon name="download" />
        {t.inbox.download.action}
      </Button>
      {tools.toast}
    </>
  );
}
