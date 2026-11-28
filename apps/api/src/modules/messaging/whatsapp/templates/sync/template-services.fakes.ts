import { HttpException } from '@nestjs/common';
import type { AuditService } from '@/common/audit/audit.service';
import { TemplateAdmin } from '@/modules/messaging/whatsapp/templates/catalog/template-admin';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TemplateVerifier } from './template-verifier';

/** The catalog, the verifier and the admin over one set of fakes, as the module wires them. */
export function templateServices(queries: object, lines: object, audit: object) {
  const repo = queries as TemplatesRepo;
  const wa = lines as WhatsappLines;
  const catalog = new TemplateRegistry(repo, wa);
  return {
    catalog,
    verifier: new TemplateVerifier(repo, wa, catalog),
    admin: new TemplateAdmin(repo, wa, audit as AuditService),
  };
}

/** An HttpException rejection as [status, response]; any other rejection is rethrown. */
export function httpFailure(e: unknown): [number, unknown] {
  if (!(e instanceof HttpException)) throw e;
  return [e.getStatus(), e.getResponse()];
}
