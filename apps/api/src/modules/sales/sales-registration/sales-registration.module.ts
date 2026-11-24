import { Module } from '@nestjs/common';
import { SalesRegistrationController } from './sales-registration.controller';
import { SalesRegistrationRepo } from './sales-registration.repo';
import { SalesRegistrationService } from './sales-registration.service';

/** Read-only, whitelisted, no feature imports. */
@Module({
  controllers: [SalesRegistrationController],
  providers: [SalesRegistrationRepo, SalesRegistrationService],
})
export class SalesRegistrationModule {}
