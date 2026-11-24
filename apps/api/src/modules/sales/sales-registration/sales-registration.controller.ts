import { registrationCheckQuerySchema, type RegistrationCheckView } from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { SalesRegistrationService } from './sales-registration.service';

/** docs/16 row 23: at most 10 children, no ids, phones, money or notes; rate-limited. */
@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesRegistrationController {
  constructor(private readonly registration: SalesRegistrationService) {}

  @Get('registration-check')
  @Permissions('students.check_registration')
  check(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<RegistrationCheckView> {
    return this.registration.check(user, parseOrThrow(registrationCheckQuerySchema, query));
  }
}
