import { Module } from '@nestjs/common';

/**
 * B2 (docs/12 §1): the Meta webhook (GET/POST /webhooks/whatsapp), the threads routes and the
 * lead qualification / follow-up routes. Registered in app.module.ts already.
 */
@Module({})
export class InboxModule {}
