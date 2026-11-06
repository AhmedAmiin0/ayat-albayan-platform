import { Injectable, Logger } from '@nestjs/common';

export type PackagePaidListener = (subscriptionId: string) => Promise<void>;

/**
 * "A payment was recorded on this package" (owner 2026-11-06): the money writes (a transfer, a
 * renewal, any payment) and a paid Stripe link (after markPaid) call `paid`; the course drafts
 * (weekly days picked before the payment) subscribe with `onPaid` and book the draft once the
 * package is active. Neither side imports the other. A failing listener is logged, never thrown:
 * the payment is already committed.
 */
@Injectable()
export class PackageEvents {
  private readonly log = new Logger(PackageEvents.name);
  private readonly listeners: PackagePaidListener[] = [];

  onPaid(listener: PackagePaidListener): void {
    this.listeners.push(listener);
  }

  async paid(subscriptionId: string): Promise<void> {
    for (const listener of this.listeners) {
      try {
        await listener(subscriptionId);
      } catch (e) {
        this.log.error(`package-paid listener failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
