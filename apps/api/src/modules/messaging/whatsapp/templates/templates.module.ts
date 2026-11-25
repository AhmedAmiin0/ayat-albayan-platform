import { Module } from '@nestjs/common';
import { WhatsappSharedModule } from '@/modules/messaging/whatsapp/shared';
import { TemplateAdmin } from './catalog/template-admin';
import { TemplateEditsController } from './catalog/template-edits.controller';
import { TemplateStarters } from './catalog/template-starters';
import { TemplatesController } from './catalog/templates.controller';
import { TemplateCreator } from './create/template-create';
import { TemplateNumbersController } from './sync/template-numbers.controller';
import { TemplateNumbers } from './sync/template-numbers.service';

/**
 * Routes T1–T3 and a number's template sync over the shared registry. catalog/ and sync/ are at
 * the folder cap and share TemplateNumbers, so their one module sits here.
 */
@Module({
  imports: [WhatsappSharedModule],
  controllers: [TemplatesController, TemplateEditsController, TemplateNumbersController],
  providers: [TemplateCreator, TemplateAdmin, TemplateStarters, TemplateNumbers],
})
export class WhatsappTemplatesModule {}
