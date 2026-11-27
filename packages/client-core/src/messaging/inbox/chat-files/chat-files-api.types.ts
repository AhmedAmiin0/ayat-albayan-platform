import type { ChatFileParams, PdfPageParams, ThreadFile, ThreadMediaItem, ThreadPdfPage } from '@ab/shared';

export interface ChatFileCalls {
  file: (params: ChatFileParams) => Promise<ThreadFile>;
  download: (params: ChatFileParams) => Promise<ThreadFile>;
  pdfPage: (params: PdfPageParams) => Promise<ThreadPdfPage>;
  media: (params: Pick<ChatFileParams, 'phone'>) => Promise<ThreadMediaItem[]>;
  mediaFile: (params: ChatFileParams) => Promise<ThreadFile>;
}
