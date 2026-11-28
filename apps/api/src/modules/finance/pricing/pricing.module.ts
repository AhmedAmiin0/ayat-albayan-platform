import { Module } from '@nestjs/common';
import { FxModule } from '@/modules/finance/fx/fx.module';
import { PdfRenderer } from '@/modules/reporting/report-pdf';
import { PriceListPdf, PriceListPdfSettings } from './list-pdf';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [FxModule],
  controllers: [PricingController],
  providers: [PricingService, PdfRenderer, PriceListPdf, PriceListPdfSettings],
  // Subscriptions (Phase 3, R-SUB-01) price a package with the same quote as /pricing.
  exports: [PricingService],
})
export class PricingModule {}
