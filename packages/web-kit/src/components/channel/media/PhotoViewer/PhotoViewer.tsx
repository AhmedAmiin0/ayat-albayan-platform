import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { buttonVariants } from '@ab/web-kit/components/ui/form/Button';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { t } from '@ab/web-kit/lib/i18n/i18n';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
}

/** Esc, the close button and the scrim close it; focus returns to the photo. */
export function PhotoViewer({ url, title, onClose }: Props) {
  const download = (
    <a
      href={url}
      download
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
    >
      <Icon name="download" />
      {t.studentChannel.web.download}
    </a>
  );
  return (
    <Dialog title={title} onClose={onClose} layout="center" actions={download}>
      <img
        src={url}
        alt={title}
        className="mx-auto max-h-[70vh] w-auto max-w-full rounded-md bg-sunk object-contain"
      />
    </Dialog>
  );
}
