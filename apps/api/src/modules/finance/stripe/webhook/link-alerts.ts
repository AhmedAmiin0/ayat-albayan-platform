import { Injectable } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { PaymentReceived } from '@/modules/finance/payments';
import { CourseDue } from '@/modules/finance/subscriptions';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.repo';

/** Staff alerts only, never WhatsApp; admin alerts reuse payment_due; never throws. */
@Injectable()
export class LinkAlerts {
  constructor(
    private readonly push: PushService,
    private readonly received: PaymentReceived,
    private readonly courseDue: CourseDue,
  ) {}

  /** Not awaited, off the webhook path; nobody recorded it by hand so nobody is skipped. */
  paid(link: LinkRow, payment: { id: string; amount: number; currency: string }): void {
    void this.tellPaid(link, payment);
  }

  private async tellPaid(link: LinkRow, payment: { id: string; amount: number; currency: string }) {
    const sub = link.subscription_id;
    const book = sub ? await this.courseDue.paidNotice(sub, link.created_by) : undefined;
    this.received.fire({
      book,
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
