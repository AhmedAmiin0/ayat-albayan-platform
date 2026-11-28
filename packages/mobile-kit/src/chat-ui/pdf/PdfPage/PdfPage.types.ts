export interface PdfZoom {
  uri: string;
  label: string;
}

export interface PdfPageProps {
  page: number;
  pages: number;
  /** The page image's URL once the caller has it. */
  url?: string;
  /** The caller could not get the URL (and holds none). */
  failed: boolean;
  /** Changes whenever the URL is fetched anew: the image loads again. */
  version?: number;
  /** Ask for the URL again (a tap on a page that failed). */
  onRetry: () => void;
  /** A tap: the page full screen, to pinch and pan (PhotoViewer). */
  onZoom: (shown: PdfZoom) => void;
}
