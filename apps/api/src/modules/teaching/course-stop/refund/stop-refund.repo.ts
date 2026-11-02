import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

/** The package's price, its lessons and the lessons it used (v_subscription_balance). */
export interface RefundPackage {
  price: number;
  lessonsTotal: number;
  attended: number;
  studentName: string;
}

const pkgSchema = z.object({
  price: z.coerce.number(),
  lessons_total: z.number().int(),
  student: z.object({ name: z.string() }).nullable(),
});

const moneySchema = z.array(
  z.object({
    id: z.string(),
    amount: z.coerce.number(),
    kind: z.enum(['payment', 'refund']),
    method: z.enum(['bank', 'wallet', 'cash', 'other', 'card']),
    currency: z.string(),
    original_amount: z.coerce.number().nullable(),
    original_currency: z.string().nullable(),
    client_request_id: z.string().nullable(),
  }),
);
/** One payments row of the package (a payment or a refund). */
export type MoneyRow = z.infer<typeof moneySchema>[number];

const intentsSchema = z.array(
  z.object({ paid_payment_id: z.string(), stripe_payment_intent: z.string() }),
);

/** «إلغاء مع استرداد»'s reads (service role; the route checks subscriptions.stop + .refund). */
@Injectable()
export class StopRefundRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** v_subscription_balance.lessons_used: the lessons it used, the imported ones included. */
  async pkg(subscriptionId: string): Promise<RefundPackage> {
    const [row, attended] = await Promise.all([
      this.sub(subscriptionId),
      this.used(subscriptionId),
    ]);
    return {
      price: row.price,
      lessonsTotal: row.lessons_total,
      attended,
      studentName: row.student?.name ?? '',
    };
  }

  private async sub(subscriptionId: string): Promise<z.infer<typeof pkgSchema>> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select('price, lessons_total, student:students(name)')
      .eq('id', subscriptionId)
      .single();
    if (error) throw dbError(error);
    return pkgSchema.parse(data);
  }

  private async used(subscriptionId: string): Promise<number> {
    const { data, error } = await this.db
      .from('v_subscription_balance')
      .select('lessons_used')
      .eq('subscription_id', subscriptionId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data?.lessons_used ?? 0;
  }

  /** Every payment and refund of the package, oldest first. */
  async money(subscriptionId: string): Promise<MoneyRow[]> {
    const { data, error } = await this.db
      .from('payments')
      .select(
        'id, amount, kind, method, currency, original_amount, original_currency, client_request_id',
      )
      .eq('subscription_id', subscriptionId)
      .order('paid_at', { ascending: true });
    if (error) throw dbError(error);
    return moneySchema.parse(data);
  }

  /** payment id → its Stripe PaymentIntent, for the payments a payment link recorded. */
  async intents(paymentIds: readonly string[]): Promise<Map<string, string>> {
    if (paymentIds.length === 0) return new Map();
    const { data, error } = await this.db
      .from('payment_links')
      .select('paid_payment_id, stripe_payment_intent')
      .in('paid_payment_id', paymentIds)
      .not('stripe_payment_intent', 'is', null);
    if (error) throw dbError(error);
    const rows = intentsSchema.parse(data);
    return new Map(rows.map((r) => [r.paid_payment_id, r.stripe_payment_intent]));
  }
}
