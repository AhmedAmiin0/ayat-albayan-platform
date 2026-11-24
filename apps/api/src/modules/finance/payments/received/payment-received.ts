import { type PaymentKind } from '@ab/catalog';
import { formatAmount } from '@ab/money';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import type { PaymentRow } from '@/modules/finance/payments/payments.repo';
import { PaymentReceivedRepo } from './payment-received.repo';
import { receivedRecipients } from './payment-received.recipients';

export interface ReceivedPayment {
  id: string;
  kind: PaymentKind;
  amount: number;
  currency: string;
  studentId: string | null;
  student: string;
}

interface ReceivedNotice {
  payment: ReceivedPayment;
  /** Who recorded it by hand (not told); null = nobody did (a Stripe payment). */
  recorderId: string | null;
  /** Told as well, e.g. the payment link's assistant. */
  also?: readonly string[];
  /** One recipient told with her own title and tap target (owner 2026-11-06). */
  book?: BookNotice | undefined;
}

/** The paid link's assistant, while the package has no weekly course (CourseDue.paidNotice). */
interface BookNotice {
  profileId: string;
  title: string;
  data: Record<string, string>;
}

/** What the family paid: the original amount and currency when it was converted. */
export const receivedOf = (row: PaymentRow): ReceivedPayment => ({
  id: row.id,
  kind: row.kind,
  amount: row.original_amount ?? row.amount,
  currency: row.original_currency ?? row.currency,
  ...studentOf(row.subscription),
});

function studentOf(sub: PaymentRow['subscription']): Pick<ReceivedPayment, 'studentId' | 'student'> {
  return { studentId: sub?.student_id ?? null, student: sub?.student?.name ?? '' };
}

/** One push subject per payment, about its student. */
const eventOf = (p: ReceivedPayment) => ({
  kind: 'payment_received' as const,
  subject: `payment:${p.id}`,
  vars: { student: p.student, amount: amountText(p) },
  ...(p.studentId ? { data: { studentId: p.studentId } } : {}),
});

const isIncoming = (p: ReceivedPayment): boolean => p.kind === 'payment';

/**
 * ONE var, sum and currency together («1,200 EGP»), as payment_due's {left}: the lock screen masks
 * it (owner 2026-10-25: no money on a lock screen); the bell row keeps it.
 */
const amountText = (p: ReceivedPayment): string => `${formatAmount(p.amount)} ${p.currency}`;

/** Admins and the following assistant minus the recorder, once per payment; refunds: nobody. */
@Injectable()
export class PaymentReceived {
  private readonly log = new Logger(PaymentReceived.name);

  constructor(
    private readonly repo: PaymentReceivedRepo,
    private readonly push: PushService,
  ) {}

  /** After the response: not awaited. */
  fire(notice: ReceivedNotice): void {
    void this.notify(notice);
  }

  async notify({ payment, recorderId, also = [], book }: ReceivedNotice): Promise<void> {
    if (!isIncoming(payment)) return;
    try {
      const [admins, owners] = await Promise.all([this.repo.adminIds(), this.owners(payment)]);
      const all = receivedRecipients({ admins, owners: [...owners, ...also], recorderId });
      const event = eventOf(payment);
      const rest = all.filter((id) => id !== book?.profileId);
      await this.push.notifyProfiles({ ...event, profileIds: rest });
      if (book) await this.push.notifyProfiles({ ...event, ...book, profileIds: [book.profileId] });
    } catch (e) {
      this.log.warn(`payment_received ${payment.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private owners(payment: ReceivedPayment): Promise<string[]> {
    return payment.studentId ? this.repo.ownerIds(payment.studentId) : Promise.resolve([]);
  }
}
