import { templateCatalogRoutes, templateEditRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { AdminTemplateCalls } from './templates-api';

/** The template registry for any reader, and a template manager's catalog and edits. */
export function adminTemplateCalls(client: ApiClient): AdminTemplateCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: templateCatalogRoutes.list }),
    create: (body) => call({ route: templateCatalogRoutes.create, body }),
    lines: () => call({ route: templateCatalogRoutes.lines }),
    health: (body) => call({ route: templateCatalogRoutes.health, body, query: {} }),
    editContent: ({ key, input }) =>
      call({ route: templateEditRoutes.content, params: { key }, body: input }),
    submit: (key) => call({ route: templateEditRoutes.submit, params: { key } }),
    moveLine: ({ key, line }) =>
      call({ route: templateEditRoutes.line, params: { key }, body: { line } }),
    setNumber: ({ key, number_id }) =>
      call({ route: templateEditRoutes.number, params: { key }, body: { number_id } }),
    setCrmStatus: ({ key, status }) =>
      call({ route: templateEditRoutes.crmStatus, params: { key }, body: { status } }),
    setCrmName: ({ key, ...body }) =>
      call({ route: templateEditRoutes.crmName, params: { key }, body }),
    setStarter: ({ key, on }) =>
      call({ route: templateEditRoutes.starter, params: { key }, body: { sales_starter: on } }),
  };
}
