import type { MessageView } from '@ab/shared';
import { Icon, Button, t } from '@ab/web-kit';
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
