export type QueryKeyParts = readonly unknown[];

type None = () => QueryKeyParts;
type One<A> = (a: A) => QueryKeyParts;
type Two<A, B> = (a: A, b: B) => QueryKeyParts;

export interface ScheduleDayKey {
  date: string;
  teacherId?: string | undefined;
}

export interface SalesKeys {
  all: readonly ['sales'];
  schedule: readonly ['sales', 'schedule'];
  teachers: None;
  allStudents: One<{ page: number; search: string }>;
  live: None;
  scheduleDay: One<ScheduleDayKey>;
  people: None;
  registrationCheck: One<unknown>;
}

export interface SalesSubscriptionKeys {
  all: readonly ['sales', 'subscriptions'];
  list: One<string>;
  teachers: None;
  history: One<string>;
}

export interface MyMoneyKeys {
  all: readonly ['sales', 'me'];
  students: None;
  earnings: None;
  commissions: One<number>;
  payments: None;
}

export interface SalesMoneyKeys {
  all: readonly ['sales', 'money'];
  family: One<string>;
  chatReceipts: One<string>;
  chatReceipt: Two<string, string>;
  course: One<string>;
  quote: Two<string, unknown>;
}

export interface PaymentLinkKeys {
  all: readonly ['sales', 'payment-links'];
  list: None;
  quote: Two<string, unknown>;
}

export interface LeadKeys {
  all: readonly ['leads'];
  list: One<unknown>;
}

export interface ApplicantKeys {
  all: readonly ['job-applicants'];
  list: One<unknown>;
}

export interface StripeKeys {
  feature: None;
}

export interface PublicLinkKeys {
  link: One<string>;
}
