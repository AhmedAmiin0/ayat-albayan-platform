import type { PortalLessonFile } from '@ab/shared';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { fileLine, fileTitle } from '@ab/web-kit/lesson-files/file-words';
import { cn } from '@ab/web-kit/lib/utils';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { useLessonFileUrl } from '@ab/web-kit/portal/recordings/use-recordings';
import { useViewer, type Viewer } from './use-viewer';
import { ViewerActions, ViewerBody } from './ViewerParts';
import { ViewerPager } from './ViewerPager';

interface Props {
  studentId: string;
  /** The lesson's files: the viewer steps through its pictures and PDFs. */
  files: readonly PortalLessonFile[];
  /** The one tapped. */
  openId: string;
  onClose: () => void;
}

/** Leaving: the card's pop-in played backwards (from 640 px; a phone's sheet just goes). */
const EXIT = 'sm:animate-[ab-pop-in_var(--duration-quick)_var(--ease-ink)_reverse_both]';

function ViewerDialog({ studentId, file, viewer }: {
  studentId: string;
  file: PortalLessonFile;
  viewer: Viewer;
}) {
  const link = useLessonFileUrl({ studentId, fileId: file.id });
  return (
    <Dialog
      title={fileTitle(file)}
      description={fileLine(file)}
      onClose={viewer.close}
      layout="center"
      className={cn('sm:max-w-[960px]', viewer.closing && EXIT)}
      actions={<ViewerActions studentId={studentId} file={file} url={link.data?.url} />}
    >
      {/* A step to another file swaps the stage with a short fade, never a jump. */}
      <div key={file.id} className="grid animate-fade-in gap-3">
        <QueryState query={link} rows={2}>
          {(d) => <ViewerBody file={file} url={d.url} />}
        </QueryState>
        {viewer.page.total > 1 && <ViewerPager page={viewer.page} onGo={viewer.go} />}
      </div>
    </Dialog>
  );
}

/**
 * A lesson's picture or PDF on the page (boards FamFilesWebImage / FamFilesWebPdf) instead of a
 * bare tab: its name and line on top, the picture (zoom) or the browser's PDF reader, the other
 * files a step away, «تنزيل» and «افتح في نافذة جديدة». The link is minted when it opens.
 */
export function FileViewer({ studentId, files, openId, onClose }: Props) {
  const viewer = useViewer({ files, openId, onClose });
  if (!viewer.file) return null;
  return <ViewerDialog studentId={studentId} file={viewer.file} viewer={viewer} />;
}
