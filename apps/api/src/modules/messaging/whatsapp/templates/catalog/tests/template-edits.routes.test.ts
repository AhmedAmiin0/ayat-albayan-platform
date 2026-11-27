import { templateEditRoutes as routes } from '@ab/shared';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { TemplateEditsController } from '@/modules/messaging/whatsapp/templates/catalog/template-edits.controller';
import { TemplateManagerGuard } from '@/modules/messaging/whatsapp/templates/catalog/template-manager.guard';

const {
  edit, submit, setLine, setNumber, setCrmStatus, setCrmName, setStarter,
} = TemplateEditsController.prototype;
const HANDLERS = [edit, submit, setLine, setNumber, setCrmStatus, setCrmName, setStarter];

describe('TemplateEditsController', () => {
  it('serves the edit routes from their route objects', () => {
    expect(HANDLERS.map(routeOf)).toEqual([
      routes.content, routes.submit, routes.line, routes.number, routes.crmStatus,
      routes.crmName, routes.starter,
    ]);
  });

  it('lets template managers in through the manager guard, tagged messaging', () => {
    for (const handler of HANDLERS) {
      expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['templates.manage']);
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['messaging']);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([TemplateManagerGuard]);
    }
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TemplateEditsController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, TemplateEditsController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, TemplateEditsController)).toBeUndefined();
  });
});
