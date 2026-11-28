import { numberTemplatesRoutes } from '@ab/shared';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { TemplateManagerGuard } from '@/modules/messaging/whatsapp/templates/catalog/template-manager.guard';
import { TemplateNumbersController } from '@/modules/messaging/whatsapp/templates/sync/template-numbers.controller';

const sync = TemplateNumbersController.prototype.sync;

describe('TemplateNumbersController', () => {
  it('serves the sync route object with templates.manage, the messaging tag and its guard', () => {
    expect(routeOf(sync)).toBe(numberTemplatesRoutes.sync);
    expect(Reflect.getMetadata(PERMISSION, sync)).toEqual(['templates.manage']);
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, sync)).toEqual(['messaging']);
    expect(Reflect.getMetadata(GUARDS_METADATA, sync)).toEqual([TemplateManagerGuard]);
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TemplateNumbersController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, TemplateNumbersController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, TemplateNumbersController)).toBeUndefined();
  });
});
