import { Injectable } from '@nestjs/common';
import { GoogleAccountQueries } from './google-account.queries';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleSettings } from './google-settings';

/** The sync's own tables: the account row, its settings and the outbox (max 3 constructor params, rule 2). */
@Injectable()
export class GoogleData {
  constructor(
    readonly account: GoogleAccountQueries,
    readonly settings: GoogleSettings,
    readonly items: GoogleItemsQueries,
  ) {}
}
