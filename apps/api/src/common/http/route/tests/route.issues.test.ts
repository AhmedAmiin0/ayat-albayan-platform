import { defineRoute, toApiIssues } from '@ab/core';
import { Controller, Module } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';

const save = defineRoute({
  method: 'POST',
  path: '/probe/issues',
  body: z
    .object({
      name: z.string().trim().min(2, 'name_too_short'),
      items: z.array(z.object({ n: z.number().max(3) })),
      kind: z.enum(['a', 'b']),
    })
    .refine((b) => b.items.length > 0, 'empty_update'),
  response: z.object({ ok: z.boolean() }),
});

@Controller()
class IssuesProbeController {
  @Route(save)
  save(@RouteInput() _input: RouteInputOf<typeof save>) {
    return { ok: true };
  }
}

@Module({ controllers: [IssuesProbeController] })
class IssuesProbeModule {}

let app: NestFastifyApplication;
beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [IssuesProbeModule] }).compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

const post = (payload: object) => app.inject({ method: 'POST', url: '/probe/issues', payload });

const BAD = { name: ' A ', items: [{ n: 9 }], kind: 'c' };

describe('validation issues: one shape on the client and the server (docs/67 PR 0)', () => {
  it('answers the same issues the client finds with the route body schema', async () => {
    const client = save.body.safeParse(BAD);
    const res = await post(BAD);
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toEqual(toApiIssues(client.error?.issues ?? []));
  });

  it('sends the zod code and its limits beside path and message', async () => {
    const res = await post(BAD);
    expect(res.json().issues).toEqual([
      {
        path: 'name',
        message: 'name_too_short',
        code: 'too_small',
        origin: 'string',
        minimum: 2,
        inclusive: true,
      },
      {
        path: 'items.0.n',
        message: expect.any(String),
        code: 'too_big',
        origin: 'number',
        maximum: 3,
        inclusive: true,
      },
      { path: 'kind', message: expect.any(String), code: 'invalid_value', values: ['a', 'b'] },
    ]);
  });

  it('keeps a root issue at the empty path with its code', async () => {
    const res = await post({ name: 'Nour', items: [], kind: 'a' });
    expect(res.json().issues).toEqual([{ path: '', message: 'empty_update', code: 'custom' }]);
  });

  it('still gives an old client the envelope, a path and a message on each issue', async () => {
    const res = await post(BAD);
    const body = z
      .object({
        message: z.literal('validation_failed'),
        issues: z.array(z.object({ path: z.string(), message: z.string() })),
      })
      .parse(res.json());
    expect(body.issues.map((i) => i.path)).toEqual(['name', 'items.0.n', 'kind']);
  });
});
