import { pathKey } from '@ab/mobile-kit';
import type { SalesKeys, SubscriptionKeys } from './sales.keys.types';

const sales = pathKey('/sales');
const subscriptions = pathKey('/sales/subscriptions');
const families = pathKey('/sales/money/family');
const receipts = pathKey('/sales/money/chat-receipts');
const links = pathKey('/sales/payment-links');

// The quotes are POST reads keyed by their body, so a new pick asks again.
export const salesKeys: SalesKeys = {
  all: sales,
  families,
  quote: (studentId, pricing, bind) => [...subscriptions, 'quote', studentId, pricing, bind],
  teachers: () => [...subscriptions, 'teachers'],
  subscriptions: (kind) => [...subscriptions, kind],
  schedule: (date, teacherId) => [...pathKey('/sales/schedule'), date, teacherId],
  family: (phone) => [...families, phone],
  chatReceipts: (studentId) => [...receipts, studentId],
  chatReceipt: (studentId, messageId) => [...receipts, studentId, messageId],
  registrationCheck: (search) => [...pathKey('/sales/registration-check'), search],
  attendance: (path, month) => [...pathKey(path), month ?? 'current'],
  linkList: () => [...links, 'list'],
  linkQuote: (studentId, pricing) => [...links, 'quote', studentId, pricing],
};

export const subscriptionKeys: SubscriptionKeys = {
  quote: (studentId, pricing) => [...pathKey('/subscriptions'), 'quote', studentId, pricing],
};
