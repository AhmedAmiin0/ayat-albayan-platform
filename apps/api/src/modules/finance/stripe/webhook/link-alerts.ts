import { Injectable } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { PaymentReceived } from '@/modules/finance/payments';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.repo';

/**
 * The payment links' staff alerts (never WhatsApp). A paid link is «تم استلام دفعة»
 * (payment_received: bell + device push) to the admins, the student's following assistant and the
 * link's assistant, once per payment. The admins' alerts (a dispute, a payment the platform could
 * not record) reuse the payment_due kind (its rule, its permission and its tap target: the
 * student), with their own title. Never throws (PushService and PaymentReceived swallow failures).
 */
@Injectable()
export class LinkAlerts {
  constructor(
    private readonly push: PushService,
    private readonly received: PaymentReceived,
  ) {}

  /** The payment recorded from the link: nobody recorded it by hand, so nobody is left out. */
  async paid(link: LinkRow, payment: { id: string; amount: number; currency: string }): Promise<void> {
    await this.received.notify({
      payment: {
        ...payment,
        kind: 'payment',
        studentId: link.student_id,
        student: link.student?.name ?? '',
      },
      recorderId: null,
      also: [link.created_by],
    });
  }

  /**
   * The admins: a dispute, or a payment Stripe took that the platform could not record (no
   * automatic change).
   */
  async admins(input: {
    subject: string;
    title: string;
    text: string;
    link: LinkRow | null;
  }): Promise<void> {
    await this.push.notifyAdmins('payment_due', {
      subject: input.subject,
      title: input.title,
      vars: { student: input.link?.student?.name ?? '', left: input.text },
      ...(input.link ? { data: { studentId: input.link.student_id } } : {}),
    });
  }
}
