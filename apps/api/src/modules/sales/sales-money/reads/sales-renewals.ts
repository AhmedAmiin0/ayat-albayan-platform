import { livePackages, salesRenewal, type SalesRenewal } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { PackagesService } from '../../../finance/subscriptions';
import type { FamilyStudentRow } from './sales-family.queries';
import { SalesMoneySettings } from '../sales-money.settings';

/**
 * «جدّد الاشتراك» from the chat (owner 2026-10-26): for each of her students, whether a renewal is due (the
 * admin's renewal-alert threshold, settings.renewal_alert_remaining) and the calculator inputs it opens with
 * (salesRenewal over the student's packages: renewalPricing of the last priced one, never a cancelled one, whitelisted).
 */
@Injectable()
export class SalesRenewals {
  constructor(
    private readonly packages: PackagesService,
    private readonly settings: SalesMoneySettings,
  ) {}

  async of(students: readonly FamilyStudentRow[]): Promise<Map<string, SalesRenewal>> {
    if (students.length === 0) return new Map();
    const { renewal_alert_remaining: threshold } = await this.settings.read();
    const entries = await Promise.all(
      students.map(async (s) => {
        const { remaining, packages } = await this.packages.studentBalance(s.id);
        return [s.id, salesRenewal({ status: s.status, remaining, threshold, packages: livePackages(packages) })] as const;
      }),
    );
    return new Map(entries);
  }
}
