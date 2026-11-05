import type { PaymentKind } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import type { PaymentRow } from '@/modules/finance/payments/payments.repo';
import { PaymentReceivedRepo } from './payment-received.repo';
import { receivedRecipients } from './payment-received.recipients';

/** A payment as «تم استلام دفعة» reads it. */
export interface ReceivedPayment {
  id: string;
  kind: PaymentKind;
  amount: number;
  currency: string;
  studentId: string | null;
  student: string;
}

export interface ReceivedNotice {
  payment: ReceivedPayment;
  /** Who recorded it by hand (not told); null = nobody did (a Stripe payment). */
  recorderId: string | null;
  /** Told as well, e.g. the payment link's assistant. */
  also?: readonly string[];
}

/** What the family paid: the original amount and currency when it was converted. */
export const receivedOf = (row: PaymentRow): ReceivedPayment => ({
  id: row.id,
  kind: row.kind,
  amount: row.original_amount ?? row.amount,
  currency: row.original_currency ?? row.currency,
  studentId: row.subscription?.student_id ?? null,
  student: row.subscription?.student?.name ?? '',
});

const isIncoming = (p: ReceivedPayment): boolean => p.kind === 'payment';

/**
 * «تم استلام دفعة» (owner 2026-11-05): an incoming payment → every admin and the student's
 * following assistant, minus who recorded it; a bell row and a device push (payment_received, its
 * own rule). Once per payment (subject `payment:<id>`, PushService's dedup key); a refund tells
 * nobody. Never throws, and `fire` keeps it off the request path.
 */
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

  async notify({ payment, recorderId, also = [] }: ReceivedNotice): Promise<void> {
    if (!isIncoming(payment)) return;
    try {
      const [admins, owners] = await Promise.all([this.repo.adminIds(), this.owners(payment)]);
      await this.push.notifyProfiles({
        kind: 'payment_received',
        profileIds: receivedRecipients({ admins, owners: [...owners, ...also], recorderId }),
        subject: `payment:${payment.id}`,
        vars: { student: payment.student, amount: payment.amount, currency: payment.currency },
        ...(payment.studentId ? { data: { studentId: payment.studentId } } : {}),
      });
    } catch (e) {
      this.log.warn(`payment_received ${payment.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private owners(payment: ReceivedPayment): Promise<string[]> {
    return payment.studentId ? this.repo.ownerIds(payment.studentId) : Promise.resolve([]);
  }
}
