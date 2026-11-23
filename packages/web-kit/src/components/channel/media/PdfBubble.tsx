import { fileSizeText, type ChannelAttachmentView } from '@ab/shared';
import { t } from '#/lib/i18n/index.ts';

interface Props {
  file: ChannelAttachmentView & { url: string };
}

const pdf = t.inbox.pdf;

/**
 * A chat PDF (FamChatWebThread): a 240px card with the «PDF» badge, the file's name on up to two
 * lines (else «ملف PDF») and «PDF · 240 كيلوبايت»; it opens in the browser's own viewer.
 */
export function PdfBubble({ file }: Props) {
  const name = file.name || t.studentChannel.kinds.pdf;
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      aria-label={pdf.open.replace('{name}', name)}
      className="ab-press flex w-60 max-w-full items-center gap-3 rounded-md border border-rule bg-page p-2.5 no-underline hover:bg-sunk"
    >
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-sm bg-danger-soft text-2xs font-bold text-danger"
      >
        {pdf.type}
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="line-clamp-2 text-sm font-semibold text-ink">{name}</span>
        <span className="text-2xs text-ink-3">
          {pdf.type} · {fileSizeText(file.size, pdf)}
        </span>
      </span>
    </a>
  );
}
