import type { QueryKey } from '@tanstack/react-query';

export interface PdfPageKey {
  phone: string;
  messageId: string;
  page: number;
}

export interface ThreadKeys {
  all: readonly ['threads'];
  lists: readonly ['threads', 'list'];
  navCount: readonly ['threads', 'nav-count'];
  list: (params: string) => QueryKey;
  detail: (phone: string) => QueryKey;
  delta: (phone: string) => QueryKey;
  pdfPage: (key: PdfPageKey) => QueryKey;
}

export interface InboxLeadKeys {
  byPhone: (phone: string) => QueryKey;
}
