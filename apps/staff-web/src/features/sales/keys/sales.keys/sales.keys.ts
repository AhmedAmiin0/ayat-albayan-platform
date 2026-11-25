import type {
  ApplicantKeys,
  LeadKeys,
  MyMoneyKeys,
  PaymentLinkKeys,
  PublicLinkKeys,
  SalesKeys,
  SalesMoneyKeys,
  SalesSubscriptionKeys,
  StripeKeys,
} from './sales.keys.types';

const all = ['sales'] as const;
const schedule = [...all, 'schedule'] as const;
const subscriptions = [...all, 'subscriptions'] as const;
const me = [...all, 'me'] as const;
const money = [...all, 'money'] as const;
const paymentLinks = [...all, 'payment-links'] as const;
const leads = ['leads'] as const;
const applicants = ['job-applicants'] as const;

// A lesson move invalidates `all`, so every salesperson read sits under it.
export const salesKeys: SalesKeys = {
  all,
  schedule,
  teachers: () => [...all, 'teachers'],
  allStudents: ({ page, search }) => [...all, 'students', 'all', page, search],
  live: () => [...all, 'live'],
  scheduleDay: ({ date, teacherId }) => [...schedule, date, teacherId ?? ''],
  people: () => [...all, 'people'],
  registrationCheck: (path) => [...all, 'registration-check', path],
};

export const salesSubscriptionKeys: SalesSubscriptionKeys = {
  all: subscriptions,
  list: (kind) => [...subscriptions, kind],
  teachers: () => [...subscriptions, 'teachers'],
  history: (id) => [...subscriptions, 'history', id],
};

export const myMoneyKeys: MyMoneyKeys = {
  all: me,
  students: () => [...me, 'students'],
  earnings: () => [...me, 'earnings'],
  commissions: (page) => [...me, 'commissions', page],
  payments: () => [...me, 'payments'],
};

export const salesMoneyKeys: SalesMoneyKeys = {
  all: money,
  family: (phone) => [...money, 'family', phone],
  chatReceipts: (studentId) => [...money, 'chat-receipts', studentId],
  chatReceipt: (studentId, messageId) => [...money, 'chat-receipt', studentId, messageId],
  course: (studentId) => [...money, 'course', studentId],
  quote: (studentId, pricing) => [...money, 'quote', studentId, pricing],
};

export const paymentLinkKeys: PaymentLinkKeys = {
  all: paymentLinks,
  list: () => [...paymentLinks, 'list'],
  quote: (studentId, pricing) => [...paymentLinks, 'quote', studentId, pricing],
};

// Leads and applicants are admin reads outside the salesperson's root: a lesson move never
// refetches the inbox.
export const leadKeys: LeadKeys = {
  all: leads,
  list: (search) => [...leads, search],
};

export const applicantKeys: ApplicantKeys = {
  all: applicants,
  list: (search) => [...applicants, search],
};

// Public reads with retry off: a sales write must not ask them again.
export const stripeKeys: StripeKeys = {
  feature: () => ['stripe', 'feature'],
};

export const publicLinkKeys: PublicLinkKeys = {
  link: (token) => ['pay', token],
};
