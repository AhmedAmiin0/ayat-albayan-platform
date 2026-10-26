import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { TeacherEarningsModule } from '../teacher-earnings/earnings.module';
import { AssistantPayController } from './assistant-pay.controller';
import { AssistantRpc } from './assistant-pay.rpc';
import { AssistantPaySettings } from './assistant-pay.settings';
import { AssistantStatementsController } from './statements/assistant-statements.controller';
import { CommissionsQueries } from './commissions/commissions.queries';
import { CorrectionsService } from './statements/corrections.service';
import { MyController } from './my/my.controller';
import { MyQueries } from './my/my.queries';
import { MyService } from './my/my.service';
import { StatementsQueries } from './statements/statements.queries';
import { StatementsService } from './statements/statements.service';
import { TermsQueries } from './terms/terms.queries';
import { TermsService } from './terms/terms.service';

/**
 * The assistant's (base role sales) pay: commission terms and salary per assistant, the commission ledger,
 * monthly statements (draft -> approved -> paid, per currency), attribution (who brought a student), and the
 * assistant's own read-only pages under /sales/me. R-ASST-02 .. R-ASST-06. The rules live in SQL
 * (migrations 20261006000270..274); this module is the guarded door to them.
 */
@Module({
  imports: [TeacherEarningsModule, PaymentsModule], // PaymentsModule: her payments' «المرفقات»
  controllers: [AssistantPayController, AssistantStatementsController, MyController],
  providers: [
    AssistantPaySettings,
    AssistantRpc,
    CommissionsQueries,
    CorrectionsService,
    MyQueries,
    MyService,
    StatementsQueries,
    StatementsService,
    TermsQueries,
    TermsService,
  ],
})
export class AssistantPayModule {}
