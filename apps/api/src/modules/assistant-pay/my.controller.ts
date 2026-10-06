import type { MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { MyService } from './my.service';

/**
 * The assistant's own pages (R-ASST-04, R-ASST-06): the students they brought, their earnings and the
 * payments they recorded. Read-only, each behind its own scope key; nobody but the sales base role holds them.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales/me')
export class MyController {
  constructor(private readonly my: MyService) {}

  @Get('students')
  @Permissions('self.sales_students')
  students(@CurrentUser() user: AuthUser): Promise<MyStudentRow[]> {
    return this.my.students(user);
  }

  @Get('earnings')
  @Permissions('self.sales_earnings')
  earnings(@CurrentUser() user: AuthUser): Promise<MyEarnings> {
    return this.my.earnings(user);
  }

  @Get('payments')
  @Permissions('self.sales_payments')
  payments(@CurrentUser() user: AuthUser): Promise<MyPaymentRow[]> {
    return this.my.payments(user);
  }
}
