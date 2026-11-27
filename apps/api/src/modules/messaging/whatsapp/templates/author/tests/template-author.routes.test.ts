import { authoredTemplateRoutes as routes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { TemplateAuthorController } from '@/modules/messaging/whatsapp/templates/author/template-author.controller';

const { list, create, edit } = TemplateAuthorController.prototype;

describe('TemplateAuthorController', () => {
  it('serves the authored routes from their route objects', () => {
    expect([list, create, edit].map(routeOf)).toEqual([routes.list, routes.create, routes.edit]);
  });

  it('lets in template authors only, tagged messaging', () => {
    for (const handler of [list, create, edit]) {
      expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['templates.author']);
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['messaging']);
    }
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TemplateAuthorController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, TemplateAuthorController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, TemplateAuthorController)).toBeUndefined();
  });
});
