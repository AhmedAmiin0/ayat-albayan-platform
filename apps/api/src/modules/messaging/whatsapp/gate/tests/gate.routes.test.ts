import { sendGateRoutes as routes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { GateController } from '@/modules/messaging/whatsapp/gate/gate.controller';

const { sending, auto, cutover } = GateController.prototype;

describe('GateController', () => {
  it('serves the three switches from their route objects', () => {
    expect([sending, auto, cutover].map(routeOf)).toEqual([
      routes.sending,
      routes.auto,
      routes.cutover,
    ]);
  });

  it('takes access and tags from the route objects', () => {
    for (const handler of [sending, auto, cutover]) {
      expect(Reflect.getMetadata(PERMISSION, handler)).toEqual(['settings.write']);
      expect(Reflect.getMetadata(DECORATORS.API_TAGS, handler)).toEqual(['messaging']);
    }
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, GateController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, GateController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, GateController)).toBeUndefined();
  });
});
