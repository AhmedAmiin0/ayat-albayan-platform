import { Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import type { LinkRow } from '@/modules/finance/stripe/links/payment-links.queries';

/**
 * The bell rows of the payment links (in-app only: bellOnly, never WhatsApp). They reuse the payment_due kind
 * (its rule, its permission and its tap target: the student), with their own title, so no notification kind
 * is added to the normal build. Never throws (PushService swallows its own failures).
 */
@Injectable()
export class LinkAlerts {
  constructor(private readonly push: PushService) {}

  /** The link's assistant: «تم الدفع عبر رابط الدفع». */
  async paid(link: LinkRow, money: { amount: number; currency: string }): Promise<void> {
    await this.push.notifyProfiles({
      kind: 'payment_due',
      profileIds: [link.created_by],
      subject: `payment_link:${link.id}`,
      title: ar.paymentLinks.bell.paidTitle,
      vars: { student: link.student?.name ?? '', left: `${money.amount} ${money.currency}` },
      data: { studentId: link.student_id },
      bellOnly: true,
    });
  }

  /** The admins: a dispute, or a payment Stripe took that the platform could not record (no automatic change). */
  async admins(input: { subject: string; title: string; text: string; link: LinkRow | null }): Promise<void> {
    await this.push.notifyAdmins('payment_due', {
      subject: input.subject,
      title: input.title,
      vars: { student: input.link?.student?.name ?? '', left: input.text },
      ...(input.link ? { data: { studentId: input.link.student_id } } : {}),
      bellOnly: true,
    });
  }
}
