import { Icon } from '#/components/ui/display/index.ts';
import { buttonVariants } from '#/components/ui/form/index.ts';
import { Dialog } from '#/components/ui/overlay/index.ts';
import { t } from '#/lib/i18n/index.ts';

interface Props {
  url: string;
  /** The caption, else «صورة». */
  title: string;
  onClose: () => void;
}

/**
 * A chat photo at full size (S14 on the web): the dialog's centred card (Esc, the ✕ and the
 * scrim close it, focus comes back to the photo), the picture fitted to the screen, «تنزيل الملف».
 */
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
