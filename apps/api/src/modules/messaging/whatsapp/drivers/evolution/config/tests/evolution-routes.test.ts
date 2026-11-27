import { evolutionRoutes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { NumbersEvolutionController } from '@/modules/messaging/whatsapp/drivers/evolution/config/evolution-admin.controller';
import { EvolutionConfigController } from '@/modules/messaging/whatsapp/drivers/evolution/config/evolution-config.controller';

const admin = NumbersEvolutionController.prototype;
const config = EvolutionConfigController.prototype;
const HANDLERS = [
  [admin.state, evolutionRoutes.state],
  [admin.qr, evolutionRoutes.qr],
  [config.config, evolutionRoutes.saveConfig],
  [config.push, evolutionRoutes.push],
  [config.verify, evolutionRoutes.verify],
] as const;

describe('evolution controllers', () => {
  it('serve their route objects with numbers.manage and the numbers tag on each handler', () => {
    expect(HANDLERS.filter(([handler, route]) => routeOf(handler) !== route)).toEqual([]);
    const permissions = HANDLERS.map(([handler]) => Reflect.getMetadata(PERMISSION, handler));
    expect(new Set(permissions.flat())).toEqual(new Set(['numbers.manage']));
    const tags = HANDLERS.map(([handler]) => Reflect.getMetadata(DECORATORS.API_TAGS, handler));
    expect(new Set(tags.flat())).toEqual(new Set(['numbers']));
  });

  it('carry no class path, permission or tag of their own', () => {
    const classes = [NumbersEvolutionController, EvolutionConfigController];
    expect(classes.map((c) => Reflect.getMetadata(PATH_METADATA, c))).toEqual(['/', '/']);
    expect(classes.map((c) => Reflect.getMetadata(PERMISSION, c))).toEqual([undefined, undefined]);
    const tags = classes.map((c) => Reflect.getMetadata(DECORATORS.API_TAGS, c));
    expect(tags).toEqual([undefined, undefined]);
  });
});
