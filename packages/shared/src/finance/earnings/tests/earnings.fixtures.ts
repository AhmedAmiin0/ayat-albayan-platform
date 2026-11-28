const TEACHER = '00000000-0000-4000-8000-000000000001';
const PAYMENT = '00000000-0000-4000-8000-000000000002';

export const earning = {
  id: '00000000-0000-4000-8000-000000000003',
  lesson_id: '00000000-0000-4000-8000-000000000004',
  starts_at: '2026-11-02T10:00:00.000Z',
  minutes: 30,
  rate: 100,
  amount: 50,
  paid_amount: 0,
  outstanding: 50,
  currency: 'EGP',
  status: 'earned',
  students: ['Omar'],
};

export const payment = {
  id: PAYMENT,
  teacher_id: TEACHER,
  amount: 50,
  currency: 'EGP',
  method: 'bank',
  paid_at: '2026-11-03T10:00:00.000Z',
  note: null,
  has_receipt: false,
  payout_id: null,
  sessions: 1,
  voided_at: null,
  void_reason: null,
};

export const balance = {
  earned: 50,
  paid: 0,
  outstanding: 50,
  overpaid: 0,
  sessions: 1,
  unpaid_sessions: 1,
  teacher: { id: TEACHER, display_name_ar: 'Teacher' },
  currency: 'EGP',
};

export const summary = {
  currency: 'EGP',
  rows: [
    {
      teacher: { id: TEACHER, display_name_ar: 'Teacher' },
      sessions: 1,
      earned: 50,
      paid: 0,
      owed: 50,
      unpaid_sessions: 1,
      oldest_unpaid_at: '2026-11-02T10:00:00.000Z',
    },
  ],
  totals: { earned: 50, paid: 0, owed: 50, teachers_owed: 1 },
};

export const pageOf = <T>(item: T) => ({ items: [item], total: 1, page: 1, pageSize: 25 });
