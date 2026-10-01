import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [FxModule],
  controllers: [PricingController],
  providers: [PricingService],
})
export class PricingModule {}
