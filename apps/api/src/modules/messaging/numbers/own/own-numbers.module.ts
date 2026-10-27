import { Global, Module } from '@nestjs/common';
import { NumbersQueries } from '../numbers.queries';
import { OwnNumbers } from './own-numbers';

/**
 * Global (owner 2026-10-27): the webhook, the inbox, the leads, the follow-ups and the dashboard all ask
 * «is this one of our numbers?» without importing NumbersModule. Register in app.module.ts.
 */
@Global()
@Module({
  providers: [NumbersQueries, OwnNumbers],
  exports: [OwnNumbers],
})
export class OwnNumbersModule {}
