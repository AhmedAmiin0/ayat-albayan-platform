import { Module } from '@nestjs/common';
import { SalesRepo } from './sales.repo';
import { SalesSettings } from './sales.settings';

/** What the root controllers, the ownership rule and the academy folder all inject. */
@Module({
  providers: [SalesRepo, SalesSettings],
  exports: [SalesRepo, SalesSettings],
})
export class SalesSharedModule {}
