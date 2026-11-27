import { defineRoute } from '@ab/core';
import { Controller, Get } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Permissions, Public, SignedIn } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { routeLines } from './route-map.test-util';

const response = z.object({ ok: z.boolean() });
const one = defineRoute({ method: 'GET', path: '/probe/x', response, permissions: ['a.read'] });
const two = defineRoute({
  method: 'GET',
  path: '/probe/x',
  response,
  permissions: ['b.write', 'a.read'],
});

@Controller('probe')
class SingleKey {
  @Get('x')
  @Permissions('students.read')
  handle() {
    return { ok: true };
  }
}

@Controller()
class OneItemList {
  @Route(defineRoute({ ...one, permissions: ['students.read'] }))
  handle() {
    return { ok: true };
  }
}

@Controller()
class TwoItemList {
  @Route(two)
  handle() {
    return { ok: true };
  }
}

const open = defineRoute({ method: 'GET', path: '/probe/x', response, isPublic: true });

@Controller('probe')
class OwnPublic {
  @Get('x')
  @Public()
  handle() {
    return { ok: true };
  }
}

@Controller()
class RoutePublic {
  @Route(open)
  handle() {
    return { ok: true };
  }
}

@Controller()
class RoutePublicSignedIn {
  @Route(open)
  @SignedIn()
  handle() {
    return { ok: true };
  }
}

const lineOf = (cls: { name: string; prototype: object }): string =>
  routeLines([cls])[0]?.replace(`${cls.name}.`, 'X.') ?? '';

describe('route map access column', () => {
  it('prints a one-item list exactly as the single key it replaces', () => {
    expect(lineOf(OneItemList)).toBe(lineOf(SingleKey));
    expect(lineOf(SingleKey)).toBe('GET /probe/x access=students.read guards=- code=- X.handle');
  });

  it('joins several keys with | in the order the route lists them', () => {
    expect(lineOf(TwoItemList)).toBe('GET /probe/x access=b.write|a.read guards=- code=- X.handle');
  });

  it("prints a route object's isPublic exactly as the @Public it replaces", () => {
    expect(lineOf(RoutePublic)).toBe(lineOf(OwnPublic));
    expect(lineOf(RoutePublic)).toBe('GET /probe/x access=public guards=- code=- X.handle');
  });

  it('keeps printing public+signed-in for a public route that is also signed-in', () => {
    const line = 'GET /probe/x access=public+signed-in guards=- code=- X.handle';
    expect(lineOf(RoutePublicSignedIn)).toBe(line);
  });
});
