import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesQueries } from './invoices.queries';
import { InvoicesService } from './invoices.service';

/** Invoice list and signed download for the admin (R-PAY-03); the files are written by booking. */
@Module({
  controllers: [InvoicesController],
  providers: [InvoicesQueries, InvoicesService],
  exports: [InvoicesQueries, InvoicesService],
})
export class InvoicesModule {}
