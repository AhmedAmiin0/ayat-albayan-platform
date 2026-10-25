import { registrationCheckQuerySchema, type RegistrationCheckView } from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { SalesRegistrationService } from './sales-registration.service';

/**
 * «التحقق من التسجيل» (docs/16 row 23): `?phone=` (E.164, the guardian's number) or `?q=` (a name of
 * 3+ letters or a code), exactly one; 400 validation_failed with one_of / invalid_phone / query_too_short.
 * Answers `{found, matches, more}`: at most 10 children, each name, code, status and teacher only
 * (never an id, a phone, money or a note); a per-user rate limit answers 429 too_many_requests.
 */
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
