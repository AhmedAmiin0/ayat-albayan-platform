import { Module } from '@nestjs/common';
import { CrmConfirmSweepJob } from './crm-confirm.job';
import { CrmConfirmRepo } from './crm-confirm.repo';
import { CrmConfirm } from './crm-confirm.service';
import { CRM_CONFIRM_SOURCE, liveCrmConfirmSource } from './crm-places';

/** A timed-out crm send confirmed from the CRM (docs/19 «Confirming an uncertain send»). */
@Module({
  providers: [
    { provide: CRM_CONFIRM_SOURCE, useFactory: liveCrmConfirmSource },
    CrmConfirmRepo,
    CrmConfirm,
    CrmConfirmSweepJob,
  ],
  exports: [CrmConfirm],
})
export class CrmConfirmModule {}
