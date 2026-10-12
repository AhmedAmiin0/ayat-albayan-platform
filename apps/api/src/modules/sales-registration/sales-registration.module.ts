import { Module } from '@nestjs/common';
import { SalesRegistrationController } from './sales-registration.controller';
import { SalesRegistrationQueries } from './sales-registration.queries';
import { SalesRegistrationService } from './sales-registration.service';

/** «التحقق من التسجيل» for sales (students.check_registration): read-only, whitelisted, no feature imports. */
@Module({
  controllers: [SalesRegistrationController],
  providers: [SalesRegistrationQueries, SalesRegistrationService],
})
export class SalesRegistrationModule {}
