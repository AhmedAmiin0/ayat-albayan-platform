import type { MessageView } from '@ab/shared';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useBubbleTools } from '@/features/messaging/inbox/messages/lib/use-bubble-tools';

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
