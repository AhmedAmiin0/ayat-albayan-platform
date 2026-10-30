import { Module } from '@nestjs/common';
import { GuardianPhonesService } from './guardian-phones.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

@Module({
  controllers: [GuardiansController],
  providers: [GuardiansService, GuardianPhonesService],
  exports: [GuardiansService],
})
export class GuardiansModule {}
