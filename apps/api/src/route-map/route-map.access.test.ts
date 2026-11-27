import { defineRoute } from '@ab/core';
import { Controller, Get } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Permissions } from '@/common/auth/decorators';
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
});
