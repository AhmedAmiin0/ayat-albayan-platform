// Mocks of the money HTTP harness (test-only, excluded from the build): split from test-app.ts (max-lines).
import { SETTING_DEFAULTS } from '@ab/shared';
import { vi } from 'vitest';

export function mocks() {
  return {
    subs: {
      list: vi.fn(), get: vi.fn(), forStudent: vi.fn(), forStudents: vi.fn(), insert: vi.fn(),
      update: vi.fn(), remove: vi.fn(), hasPayments: vi.fn(), paid: vi.fn(), studentForQuote: vi.fn(),
      byRequest: vi.fn(),
    },
    cancels: { linkedLessons: vi.fn(), laterCommission: vi.fn(), cancel: vi.fn() }, // «إلغاء الباقة»
    leads: { afterPackage: vi.fn() },
    activation: { afterPayment: vi.fn() },
    statuses: { student: vi.fn(), lastStatusChange: vi.fn(), hasPositivePayment: vi.fn(), move: vi.fn() },
    trials: { studentsOfTrialLessons: vi.fn(), lessonsOf: vi.fn() },
    balances: { forSubscriptions: vi.fn(), forStudents: vi.fn() },
    alerts: {
      studentsOfLessons: vi.fn(), studentsWithPackages: vi.fn(), raiseTask: vi.fn(), recipient: vi.fn(),
      queueRenewal: vi.fn(), closeTasks: vi.fn(),
    },
    tasks: { list: vi.fn(), done: vi.fn() },
    payments: {
      list: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), subscription: vi.fn(),
      recorders: vi.fn(), byRequest: vi.fn(), byInvoice: vi.fn(), totals: vi.fn(), netPaid: vi.fn(),
    },
    payouts: {
      teachers: vi.fn(), lessons: vi.fn(), forMonth: vi.fn(), forTeacher: vi.fn(), get: vi.fn(),
      insert: vi.fn(), update: vi.fn(), removeDraft: vi.fn(), pendingReports: vi.fn(), editedSince: vi.fn(),
    },
    earnings: {
      teacher: vi.fn(), money: vi.fn(), sessions: vi.fn(), forPayment: vi.fn(), payments: vi.fn(), payment: vi.fn(),
      byRequest: vi.fn(), record: vi.fn(), settlePayout: vi.fn(), resync: vi.fn(), paidOnLessons: vi.fn(),
    },
    corrections: { voidPayment: vi.fn(), payPayout: vi.fn(), unpayPayout: vi.fn(), reopenPayout: vi.fn(), summary: vi.fn() },
    expenses: {
      between: vi.fn(), get: vi.fn(), insert: vi.fn(), update: vi.fn(), remove: vi.fn(), categories: vi.fn(),
      addCategory: vi.fn(), createRecurringDrafts: vi.fn(),
    },
    fx: { rateSarAt: vi.fn(), rateSarTo: vi.fn() },
    invoices: { get: vi.fn(), byRules: vi.fn(), ruleIdsOf: vi.fn() },
    teachers: { idByProfile: vi.fn() },
    access: { check: vi.fn() },
    audit: { record: vi.fn() },
    settings: { all: vi.fn() },
    storage: { signedUpload: vi.fn(), signedDownload: vi.fn(), exists: vi.fn(), remove: vi.fn(), info: vi.fn(), copy: vi.fn(), head: vi.fn() },
    pricing: { quote: vi.fn(), catalog: vi.fn() },
    attachments: { forPayment: vi.fn(), save: vi.fn(), owners: vi.fn() }, // payment_attachments
    // The salesperson's money routes (sales-money): her ownership, her families, the chat files.
    sales: { ownership: vi.fn() },
    family: { studentsOfPhone: vi.fn(), familyPhone: vi.fn(), studentStatus: vi.fn() },
    media: { load: vi.fn(), cache: vi.fn(), ensure: vi.fn() },
    mediaQueries: { recent: vi.fn(), message: vi.fn(), setPath: vi.fn() },
  };
}
export type Mocks = ReturnType<typeof mocks>;

/** Defaults: an empty student, no payments, default settings. Call in beforeEach. */
export function resetMocks(m: Mocks): void {
  for (const group of Object.values(m)) for (const fn of Object.values(group)) fn.mockReset();
  m.subs.forStudent.mockResolvedValue([]);
  m.subs.forStudents.mockResolvedValue([]);
  m.subs.paid.mockResolvedValue(new Map());
  m.balances.forSubscriptions.mockResolvedValue(new Map());
  m.balances.forStudents.mockResolvedValue([]);
  m.payments.recorders.mockResolvedValue(new Map());
  m.payouts.pendingReports.mockResolvedValue(0);
  m.payouts.editedSince.mockResolvedValue(0);
  m.payments.byRequest.mockResolvedValue(null);
  m.payments.totals.mockResolvedValue([]);
  m.payments.byInvoice.mockResolvedValue(null);
  m.earnings.byRequest.mockResolvedValue(null);
  m.earnings.settlePayout.mockResolvedValue(null);
  m.earnings.paidOnLessons.mockResolvedValue(0);
  m.subs.byRequest.mockResolvedValue(null);
  m.cancels.linkedLessons.mockResolvedValue(0);
  m.cancels.laterCommission.mockResolvedValue(false);
  m.settings.all.mockResolvedValue(SETTING_DEFAULTS);
  m.storage.remove.mockResolvedValue(undefined);
  m.attachments.forPayment.mockResolvedValue([]);
  m.attachments.owners.mockResolvedValue([]); // no path held by another payment
  m.statuses.student.mockResolvedValue(null); // no student row: the status rules change nothing
  m.statuses.lastStatusChange.mockResolvedValue(null);
  m.trials.studentsOfTrialLessons.mockResolvedValue([]);
  m.trials.lessonsOf.mockResolvedValue([]); // no trial lesson
}
