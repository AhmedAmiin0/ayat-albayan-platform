// Test kit of «إلغاء مع استرداد» (test-only, excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { StripeClients } from '@/modules/finance/stripe';
import type { CourseStopSettings } from './course-stop.settings';
import { StopRefundCards } from './stop-refund.cards';
import type { StopRefundLedger } from './stop-refund.ledger';
import type { MoneyRow, StopRefundRepo } from './stop-refund.repo';
import { StopRefunds } from './stop-refund.service';

/** refunds.list's answer, as the SDK's auto-paging list. */
export const listed = (data: object[]) => ({ autoPagingToArray: () => Promise.resolve(data) });

export const REQ = 'e0000000-0000-4000-8000-0000000000e1';
export const SUB = { id: 'sub1', studentId: 'st1', currency: 'SAR' };
/** A custom refund amount (the sheet's «مبلغ مخصص»). */
export const custom = (amount: number) => ({ choice: 'custom' as const, amount });

export const row = (over: Partial<MoneyRow> = {}): MoneyRow => ({
  id: 'p-bank',
  amount: 90,
  kind: 'payment',
  method: 'bank',
  currency: 'SAR',
  original_amount: null,
  original_currency: null,
  client_request_id: null,
  ...over,
});
export const cardRow = (over: Partial<MoneyRow> = {}): MoneyRow =>
  row({ id: 'p-card', amount: 200, method: 'card', ...over });

/** 400 SAR / 8 lessons, `attended` used; a 200 card payment (pi_1) and a 90 bank one. */
export function kit(input: { attended?: number; rate?: number } = {}) {
  const stripe = { refunds: { list: vi.fn(), create: vi.fn() } };
  stripe.refunds.list.mockReturnValue(listed([]));
  stripe.refunds.create.mockResolvedValue({ id: 're_new' });
  const repo = {
    pkg: vi.fn().mockResolvedValue({
      price: 400,
      lessonsTotal: 8,
      attended: input.attended ?? 0,
      studentName: 'ط',
    }),
    money: vi.fn().mockResolvedValue([cardRow(), row()]),
    intents: vi.fn().mockResolvedValue(new Map([['p-card', 'pi_1']])),
  };
  const clients = { client: vi.fn().mockResolvedValue(stripe) };
  const ledger = { manual: vi.fn(), audit: vi.fn() };
  const settings = {
    read: vi.fn().mockResolvedValue({ refund_attended_rate_percent: input.rate ?? 100 }),
  };
  const cards = new StopRefundCards(clients as unknown as StripeClients);
  const service = new StopRefunds(
    repo as unknown as StopRefundRepo,
    cards,
    ledger as unknown as StopRefundLedger,
    settings as unknown as CourseStopSettings,
  );
  return { service, stripe, repo, clients, ledger };
}
