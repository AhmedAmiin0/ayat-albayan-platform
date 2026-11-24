import { Module } from '@nestjs/common';
import { WebhookConfigReload } from './webhook.reload';

/** The one config reload before a change for an unknown number is ignored (docs/09). */
@Module({
  providers: [WebhookConfigReload],
  exports: [WebhookConfigReload],
})
export class WebhookLinesModule {}
