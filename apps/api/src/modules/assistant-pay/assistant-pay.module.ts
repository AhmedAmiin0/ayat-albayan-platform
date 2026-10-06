import { Module } from '@nestjs/common';
import { TeacherEarningsModule } from '../teacher-earnings/earnings.module';
import { AssistantPayController } from './assistant-pay.controller';
import { AssistantRpc } from './assistant-pay.rpc';
import { AssistantStatementsController } from './assistant-statements.controller';
import { CommissionsQueries } from './commissions.queries';
import { CorrectionsService } from './corrections.service';
import { MyController } from './my.controller';
import { MyQueries } from './my.queries';
import { MyService } from './my.service';
import { StatementsQueries } from './statements.queries';
import { StatementsService } from './statements.service';
import { TermsQueries } from './terms.queries';
import { TermsService } from './terms.service';

/**
 * The assistant's (base role sales) pay: commission terms and salary per assistant, the commission ledger,
 * monthly statements (draft -> approved -> paid, per currency), attribution (who brought a student), and the
 * assistant's own read-only pages under /sales/me. R-ASST-02 .. R-ASST-06. The rules live in SQL
 * (migrations 20261006000270..274); this module is the guarded door to them.
 */
@Module({
  imports: [TeacherEarningsModule],
  controllers: [AssistantPayController, AssistantStatementsController, MyController],
  providers: [
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
