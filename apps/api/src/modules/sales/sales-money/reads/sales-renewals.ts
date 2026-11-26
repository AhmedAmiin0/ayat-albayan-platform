import { salesRenewal, type SalesRenewal } from '@ab/shared';
import { livePackages, type StudentBalanceView } from '@ab/money';
import { Injectable } from '@nestjs/common';
import { PackagesService } from '@/modules/finance/subscriptions';
import { type FamilyStudentRow, SalesMoneySettings } from '@/modules/sales/sales-money/shared';

/** Per student: whether a renewal is due and the calculator inputs, never a cancelled package. */
@Injectable()
export class SalesRenewals {
  constructor(
    private readonly packages: PackagesService,
    private readonly settings: SalesMoneySettings,
  ) {}

  async of(students: readonly FamilyStudentRow[]): Promise<Map<string, SalesRenewal>> {
    if (students.length === 0) return new Map();
    const { renewal_alert_remaining: threshold } = await this.settings.read();
    const balances = await this.packages.studentBalances(students);
    const renewal = (s: FamilyStudentRow, { remaining, packages }: StudentBalanceView) =>
      salesRenewal({ status: s.status, remaining, threshold, packages: livePackages(packages) });
    return new Map(balances.map(([s, b]) => [s.id, renewal(s, b)]));
  }
}
