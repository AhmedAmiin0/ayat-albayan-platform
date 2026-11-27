import { defineRoute } from '@ab/core';
import { Controller } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { IS_PUBLIC, OWN_PUBLIC, Public } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';

const response = z.object({ ok: z.boolean() });
const routes = {
  open: defineRoute({ method: 'GET', path: '/probe/open', response, isPublic: true }),
  closed: defineRoute({ method: 'GET', path: '/probe/closed', response }),
};

@Controller()
class RoutePublicProbe {
  @Route(routes.open)
  open() {
    return { ok: true };
  }

  @Route(routes.closed)
  closed() {
    return { ok: true };
  }

  @Route(routes.open)
  @Public()
  doubledBelow() {
    return { ok: true };
  }

  @Public()
  @Route(routes.open)
  doubledAbove() {
    return { ok: true };
  }
}

const own = (key: string, handler: object): unknown => Reflect.getOwnMetadata(key, handler);
const { open, closed, doubledBelow, doubledAbove } = RoutePublicProbe.prototype;

describe('@Route isPublic', () => {
  it('marks the handler public when its route object says isPublic', () => {
    expect(own(IS_PUBLIC, open)).toBe(true);
  });

  it('leaves a handler whose route object does not say isPublic unmarked', () => {
    expect(own(IS_PUBLIC, closed)).toBeUndefined();
  });

  it("never sets the mark of the handler's own @Public", () => {
    expect(own(OWN_PUBLIC, open)).toBeUndefined();
  });

  it("keeps the handler's own @Public visible whatever the decorator order", () => {
    expect([own(OWN_PUBLIC, doubledBelow), own(OWN_PUBLIC, doubledAbove)]).toEqual([true, true]);
  });
});
