import { Module } from '@nestjs/common';
import { WhatsappSharedModule } from '@/modules/messaging/whatsapp/shared';
import { TemplateAuthor } from './template-author';
import { TemplateAuthorController } from './template-author.controller';
import { TemplateAuthorRepo } from './template-author.repo';

/** Sales authoring of templates and the admin's edit of an authored one. */
@Module({
  imports: [WhatsappSharedModule],
  controllers: [TemplateAuthorController],
  providers: [TemplateAuthor, TemplateAuthorRepo],
})
export class TemplateAuthorModule {}
