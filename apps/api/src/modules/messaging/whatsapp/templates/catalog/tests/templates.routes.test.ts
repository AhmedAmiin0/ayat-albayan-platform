import { templateCatalogRoutes as routes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { TemplatesController } from '@/modules/messaging/whatsapp/templates/catalog/templates.controller';

const { list, create, lines, health } = TemplatesController.prototype;

describe('TemplatesController', () => {
  it('serves the catalog routes from their route objects', () => {
    expect([list, create, lines, health].map(routeOf))
      .toEqual([routes.list, routes.create, routes.lines, routes.health]);
  });

  it('lets any reader list and template managers change, tagged messaging', () => {
    expect(Reflect.getMetadata(PERMISSION, list)).toEqual(['messages.read']);
    for (const handler of [create, lines, health]) {
      expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['templates.manage']);
    }
    for (const handler of [list, create, lines, health]) {
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['messaging']);
    }
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TemplatesController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, TemplatesController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, TemplatesController)).toBeUndefined();
  });
});
