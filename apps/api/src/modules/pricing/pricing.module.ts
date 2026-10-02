import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [FxModule],
  controllers: [PricingController],
  providers: [PricingService],
  // Subscriptions (Phase 3, R-SUB-01) price a package with the same quote as /pricing.
  exports: [PricingService],
})
export class PricingModule {}
