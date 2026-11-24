import { TemplateEditor } from '@/modules/messaging/whatsapp/templates/edit/template-editor';
import { TemplateAuthor } from './template-author';
import { TemplateAuthorController } from './template-author.controller';
import { TemplateAuthorRepo } from './template-author.repo';

/** Sales authoring and the admin's edit, as whatsapp.module wires them. */
export const TEMPLATE_AUTHOR_PROVIDERS = [TemplateEditor, TemplateAuthor, TemplateAuthorRepo];
export const TEMPLATE_AUTHOR_CONTROLLERS = [TemplateAuthorController];
