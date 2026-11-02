import { Module } from '@nestjs/common';
import { PaymentsModule } from '@/modules/finance/payments/payments.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { TeacherEarningsModule } from '@/modules/finance/teacher-earnings/earnings.module';
import { AssistantPayController } from './admin/assistant-pay.controller';
import { AssistantRpc } from './shared/assistant-pay.rpc';
import { AssistantPaySettings } from './shared/assistant-pay.settings';
import { AssistantStatementsController } from './statements/assistant-statements.controller';
import { CommissionsRepo } from './commissions/commissions.repo';
import { CorrectionsService } from './statements/corrections.service';
import { MyController } from './my/my.controller';
import { MyRepo } from './my/my.repo';
import { MyService } from './my/my.service';
import { StatementsRepo } from './statements/statements.repo';
import { StatementsService } from './statements/statements.service';
import { TermsRepo } from './terms/terms.repo';
import { TermsEnv, TermsService } from './terms/terms.service';

/**
 * The assistant's (base role sales) pay: commission terms and salary per assistant, the commission ledger,
 * monthly statements (draft -> approved -> paid, per currency), attribution (who brought a student), and the
 * assistant's own read-only pages under /sales/me. R-ASST-02 .. R-ASST-06. The rules live in SQL
 * (migrations 20261006000270..274); this module is the guarded door to them.
 */
@Module({
  // PaymentsModule: her payments' «المرفقات»; SubscriptionsModule: CommissionBell after an attribution or new terms.
  imports: [TeacherEarningsModule, PaymentsModule, SubscriptionsModule],
  controllers: [AssistantPayController, AssistantStatementsController, MyController],
  providers: [
    AssistantPaySettings,
    AssistantRpc,
    CommissionsRepo,
    CorrectionsService,
    MyRepo,
    MyService,
    StatementsRepo,
    StatementsService,
    TermsEnv,
    TermsRepo,
    TermsService,
  ],
})
export class AssistantPayModule {}
