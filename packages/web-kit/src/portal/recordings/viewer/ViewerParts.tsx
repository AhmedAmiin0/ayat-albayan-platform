import { downloadName } from '@ab/client-core';
import type { LessonFileMedia, PortalLessonFile } from '@ab/shared';
import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { fileTitle } from '@ab/web-kit/lesson-files/file-words';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useSaveLessonFile } from '@ab/web-kit/portal/recordings/use-recordings';
import { ImageView } from './ImageView';

const V = t.familyFiles;

interface Shown {
  file: PortalLessonFile;
  url: string;
}

/** The browser's own reader, no PDF library; a phone can still open it in a new window. */
function PdfView({ file, url }: Shown) {
  return (
    <iframe
      src={url}
      title={V.pdfFrame.replace('{title}', fileTitle(file))}
      className="h-[68dvh] w-full rounded-md border border-rule bg-sunk"
    />
  );
}

/** What the viewer draws per kind; a voice note never opens here. */
const BODY: Record<Exclude<LessonFileMedia, 'audio'>, (shown: Shown) => ReactNode> = {
  image: ({ file, url }) => <ImageView url={url} alt={fileTitle(file)} />,
  pdf: (shown) => <PdfView {...shown} />,
};

export function ViewerBody({ file, url }: Shown) {
  const draw = file.media === 'audio' ? null : BODY[file.media];
  return <>{draw?.({ file, url })}</>;
}

interface ActionsProps {
  studentId: string;
  file: PortalLessonFile;
  /** The file's link once minted (the tab opens it as is). */
  url: string | undefined;
}

/** The saving link is minted on the tap; a failure says so. */
export function ViewerActions({ studentId, file, url }: ActionsProps) {
  const save = useSaveLessonFile(studentId);
  if (!url) return null;
  const name = downloadName({ title: fileTitle(file), mime: file.mime });
  return (
    <>
      {save.isError && (
        <span role="alert" className="text-xs text-danger">{t.lessonFiles.fileFailed}</span>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className={buttonVariants({ variant: 'secondary' })}>
        <Icon name="external" />
        {V.openTab}
      </a>
      <Button type="button" variant="secondary" disabled={save.isPending}
        onClick={() => save.mutate({ fileId: file.id, name })}>
        <Icon name="download" />
        {V.download}
      </Button>
    </>
  );
}
