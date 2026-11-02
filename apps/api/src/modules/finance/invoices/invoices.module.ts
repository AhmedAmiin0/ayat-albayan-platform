import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesRepo } from './invoices.repo';
import { InvoicesService } from './invoices.service';
import { InvoicesSettings } from './invoices.settings';

/** Invoice list and signed download for the admin (R-PAY-03); the files are written by booking. */
@Module({
  controllers: [InvoicesController],
  providers: [InvoicesRepo, InvoicesService, InvoicesSettings],
  exports: [InvoicesRepo, InvoicesService],
})
export class InvoicesModule {}
