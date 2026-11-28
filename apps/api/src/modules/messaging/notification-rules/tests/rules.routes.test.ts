import { notificationRuleRoutes as routes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import {
  RulesAliasController,
  RulesController,
} from '@/modules/messaging/notification-rules/rules.controller';

const { overview, update } = RulesController.prototype;
const alias = RulesAliasController.prototype.update;

describe('RulesController', () => {
  it('serves the catalogue and the row writes from their route objects', () => {
    expect([overview, update, alias].map(routeOf)).toEqual([
      routes.overview,
      routes.update,
      routes.updateAlias,
    ]);
  });

  it('takes access and tags from the route objects', () => {
    expect(Reflect.getMetadata(PERMISSION, overview)).toEqual(['settings.read']);
    for (const handler of [update, alias]) {
      expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['notifications.manage']);
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['notifications']);
    }
  });

  it('carries no class path or tag of its own', () => {
    for (const controller of [RulesController, RulesAliasController]) {
      expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe('/');
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, controller)).toBeUndefined();
    }
  });
});
