import type { StaffKey } from './staff.keys.types';

export interface SalesKeys {
  all: StaffKey;
  families: StaffKey;
  quote: (studentId: string, pricing: unknown, bind: unknown) => StaffKey;
  teachers: () => StaffKey;
  subscriptions: (kind: string) => StaffKey;
  schedule: (date: string, teacherId: string) => StaffKey;
  family: (phone: string) => StaffKey;
  chatReceipts: (studentId: string) => StaffKey;
  chatReceipt: (studentId: string, messageId: string) => StaffKey;
  registrationCheck: (search: unknown) => StaffKey;
  attendance: (path: string, month: string | null) => StaffKey;
  linkList: () => StaffKey;
  linkQuote: (studentId: string, pricing: unknown) => StaffKey;
}

export interface SubscriptionKeys {
  quote: (studentId: string, pricing: unknown) => StaffKey;
}
