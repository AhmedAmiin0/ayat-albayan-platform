import type { StaffKey } from './staff.keys.types';

export interface ThreadKeys {
  all: StaffKey;
  lists: StaffKey;
  navCount: StaffKey;
  chat: (phone: string) => StaffKey;
  pdfPage: (phone: string, messageId: string, page: number) => StaffKey;
  gifs: (q: string) => StaffKey;
}

export interface LeadKeys {
  all: StaffKey;
  lists: StaffKey;
  one: (id: string) => StaffKey;
  byPhone: (phone: string) => StaffKey;
}
