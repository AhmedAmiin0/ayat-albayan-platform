import { defineRoute } from '@ab/core';
import { Controller } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PERMISSION, Permissions } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';

const response = z.object({ ok: z.boolean() });
const routes = {
  guarded: defineRoute({
    method: 'GET',
    path: '/probe/guarded',
    response,
    permissions: ['payments.read', 'payments.write'],
    tags: ['probe', 'finance'],
  }),
  plain: defineRoute({ method: 'GET', path: '/probe/plain', response }),
  doubled: defineRoute({
    method: 'GET',
    path: '/probe/doubled',
    response,
    permissions: ['payments.read'],
  }),
};

@Controller()
class RouteAccessProbe {
  @Route(routes.guarded)
  guarded() {
    return { ok: true };
  }

  @Route(routes.plain)
  @Permissions('students.read')
  plain() {
    return { ok: true };
  }

  @Route(routes.doubled)
  @Permissions('students.read')
  doubled() {
    return { ok: true };
  }
}

const own = (key: string, handler: object): unknown => Reflect.getOwnMetadata(key, handler);
const { guarded, plain, doubled } = RouteAccessProbe.prototype;

describe('@Route permissions and tags', () => {
  it("sets the handler's PERMISSION metadata to the route's own list", () => {
    expect(own(PERMISSION, guarded)).toBe(routes.guarded.permissions);
  });

  it("applies the route's tags to the operation", () => {
    expect(own(DECORATORS.API_TAGS, guarded)).toEqual(['probe', 'finance']);
  });

  it('sets nothing for a route without permissions or tags', () => {
    expect(own(PERMISSION, plain)).toBe('students.read');
    expect(own(DECORATORS.API_TAGS, plain)).toBeUndefined();
  });

  it("keeps a handler's own @Permissions, so the coverage test sees two sources", () => {
    expect(own(PERMISSION, doubled)).toBe('students.read');
  });
});
