// Test fixtures for the finance screens (test-only).
import type { ExpenseCategoryView, ExpenseView, InvoiceView, PayoutView } from '@ab/shared';

export const PAYOUT: PayoutView = {
  id: 'p1',
  teacher: { id: 't1', display_name_ar: 'أبرار' },
  month: '2026-09',
  lessons_count: 10,
  amount: 1600,
  currency: 'EGP',
  status: 'draft',
  approved_at: null,
  paid_at: null,
  breakdown: {
    lines: [
      { duration: 45, lessons: 8, rate: 150, amount: 1200 },
      { duration: 60, lessons: 2, rate: 200, amount: 400 },
    ],
    lesson_ids: [],
    statuses: [],
  },
};

export const APPROVED: PayoutView = { ...PAYOUT, id: 'p2', teacher: { id: 't2', display_name_ar: 'سلمى' }, status: 'approved', approved_at: '2026-10-01T10:00:00Z', ledger_paid: 100 };
export const PAID: PayoutView = { ...APPROVED, id: 'p3', teacher: { id: 't3', display_name_ar: 'هدى' }, status: 'paid', paid_at: '2026-10-02T10:00:00Z', method: 'bank', note: 'دفعة أكتوبر', has_receipt: true };

export const EXPENSE = (n: number, patch: Partial<ExpenseView> = {}): ExpenseView => ({
  id: `x${n}`,
  month: '2026-10',
  category: 'ads',
  amount: 100 * n,
  currency: 'EGP',
  note: null,
  created_at: '2026-10-02T10:00:00Z',
  paid_on: '2026-10-02',
  vendor: null,
  method: null,
  has_receipt: false,
  recurring: false,
  is_draft: false,
  ...patch,
});

export const CATEGORIES: ExpenseCategoryView[] = [
  { key: 'ads', label_ar: 'إعلانات', label_en: 'Ads', active: true },
  { key: 'rent', label_ar: 'إيجار', label_en: 'Rent', active: true },
  { key: 'old', label_ar: 'قديم', label_en: null, active: false },
];

export const INVOICE = (n: number, patch: Partial<InvoiceView> = {}): InvoiceView => ({
  id: `i${n}`,
  rule_id: `r${n}`,
  kind: 'package',
  mime: 'image/jpeg',
  size_bytes: 1000,
  source: 'upload',
  created_at: '2026-10-03T10:00:00Z',
  students: [{ id: `s${n}`, name: 'سهيلة', code: 'AB-0001' }],
  payment_id: null,
  ...patch,
});
