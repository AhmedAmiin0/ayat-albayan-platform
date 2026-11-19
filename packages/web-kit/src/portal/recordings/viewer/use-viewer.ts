import { viewableFiles, viewerPage, type ViewerPage } from '@ab/client-core';
import type { PortalLessonFile } from '@ab/shared';
import { useState } from 'react';

/** The dialog leaves as it came (pop-in played backwards) before it unmounts: --duration-quick. */
const EXIT_MS = 160;

export interface Viewer {
  /** The file on show; undefined only when no picture or PDF was given. */
  file: PortalLessonFile | undefined;
  page: ViewerPage<PortalLessonFile>;
  /** The exit plays; the dialog unmounts after it. */
  closing: boolean;
  go: (file: PortalLessonFile) => void;
  close: () => void;
}

/**
 * The viewer's state: which of the lesson's pictures and PDFs is on show (it opens on the one
 * tapped, the others a step away), and a close that lets the exit play first.
 */
export function useViewer(input: {
  files: readonly PortalLessonFile[];
  openId: string;
  onClose: () => void;
}): Viewer {
  const shown = viewableFiles(input.files);
  const [id, setId] = useState(input.openId);
  const [closing, setClosing] = useState(false);
  const page = viewerPage(shown, id);
  return {
    file: shown[page.number - 1],
    page,
    closing,
    go: (file) => setId(file.id),
    close: () => {
      setClosing(true);
      window.setTimeout(input.onClose, EXIT_MS);
    },
  };
}
