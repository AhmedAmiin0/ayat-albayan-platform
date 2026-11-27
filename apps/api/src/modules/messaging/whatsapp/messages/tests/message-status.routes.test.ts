import { messageStatusRoutes } from '@ab/shared';
import { PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { MessagesController } from '@/modules/messaging/whatsapp/messages/messages.controller';

const handlers = MessagesController.prototype;
const HANDLERS = [
  [handlers.gate, messageStatusRoutes.gate],
  [handlers.retry, messageStatusRoutes.retry],
  [handlers.sentManually, messageStatusRoutes.sentManually],
  [handlers.appSend, messageStatusRoutes.appSend],
  [handlers.handOff, messageStatusRoutes.handOff],
] as const;

describe('MessagesController', () => {
  it('serves its route objects, each with its own permissions and the messaging tag', () => {
    expect(HANDLERS.filter(([handler, route]) => routeOf(handler) !== route)).toEqual([]);
    const permissions = HANDLERS.map(([handler]) => Reflect.getMetadata(PERMISSION, handler));
    expect(permissions).toEqual(HANDLERS.map(([, route]) => route.permissions));
    const tags = HANDLERS.map(([handler]) => Reflect.getMetadata(DECORATORS.API_TAGS, handler));
    expect(new Set(tags.flat())).toEqual(new Set(['messaging']));
  });

  it('carries no class path, permission or tag of its own', () => {
    expect(Reflect.getMetadata(PATH_METADATA, MessagesController)).toBe('/');
    expect(Reflect.getMetadata(PERMISSION, MessagesController)).toBeUndefined();
    expect(Reflect.getMetadata(DECORATORS.API_TAGS, MessagesController)).toBeUndefined();
  });
});
