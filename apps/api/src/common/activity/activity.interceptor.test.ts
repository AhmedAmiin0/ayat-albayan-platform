import { Controller, Delete, HttpCode, NotFoundException, Post, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityRequest } from './activity.entry';
import { ActivityInterceptor } from './activity.interceptor';
import type { ActivityWriter } from './activity.writer';

const ID = '0b8e2c55-0000-4000-8000-000000000001';
const ADMIN = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' as const };

@Controller('expenses')
class ExpensesController {
  @Post()
  create(): void {}
  @Delete(':id')
  @HttpCode(204)
  remove(): void {}
}

type Handler = 'create' | 'remove';

function ctxFor(req: Partial<ActivityRequest>, handler: Handler = 'create'): ExecutionContext {
  const full: ActivityRequest = { method: 'POST', headers: { 'user-agent': 'jest' }, ...req };
  return {
    getType: () => 'http',
    getClass: () => ExpensesController,
    getHandler: () => ExpensesController.prototype[handler],
    switchToHttp: () => ({ getRequest: () => full }),
  } as unknown as ExecutionContext;
}

function setup(push: (row: unknown) => void = () => undefined) {
  const writer = { push: vi.fn(push) };
  const interceptor = new ActivityInterceptor(new Reflector(), writer as unknown as ActivityWriter);
  return { writer, interceptor };
}

describe('ActivityInterceptor', () => {
  it('records a mutation with actor, route pattern, action, created id and field names', async () => {
    const { writer, interceptor } = setup();
    const ctx = ctxFor({ user: ADMIN, body: { amount: 10, note: 'private' }, ip: '10.0.0.1' });
    const out = await firstValueFrom(interceptor.intercept(ctx, { handle: () => of({ id: ID }) }));
    expect(out).toEqual({ id: ID });
    expect(writer.push).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: ADMIN.id,
        actor_role: 'admin',
        action: 'expenses.create',
        method: 'POST',
        route: '/expenses',
        entity: 'expenses',
        entity_id: ID,
        status: 201,
        ip: '10.0.0.1',
        user_agent: 'jest',
        meta: { fields: ['amount', 'note'] },
      }),
    );
    expect(JSON.stringify(writer.push.mock.calls)).not.toContain('private');
  });

  it('uses the Fastify route pattern and @HttpCode, never the raw URL', async () => {
    const { writer, interceptor } = setup();
    const ctx = ctxFor({ method: 'DELETE', params: { id: ID }, routeOptions: { url: '/expenses/:id' } }, 'remove');
    await firstValueFrom(interceptor.intercept(ctx, { handle: () => of(undefined) }));
    expect(writer.push).toHaveBeenCalledWith(
      expect.objectContaining({ actor_id: null, actor_role: 'public', route: '/expenses/:id', entity_id: ID, status: 204 }),
    );
  });

  it.each([
    { method: 'GET', routeOptions: { url: '/expenses' } },
    { method: 'POST', routeOptions: { url: '/webhooks/whatsapp' } },
    { method: 'POST', routeOptions: { url: '/livekit/webhook' } },
    { method: 'POST', routeOptions: { url: '/health' } },
  ])('skips $method $routeOptions.url', async (req) => {
    const { writer, interceptor } = setup();
    await firstValueFrom(interceptor.intercept(ctxFor(req), { handle: () => of('ok') }));
    expect(writer.push).not.toHaveBeenCalled();
  });

  it('captures the status of a thrown error and rethrows it unchanged', async () => {
    const { writer, interceptor } = setup();
    const err = new NotFoundException();
    const run = interceptor.intercept(ctxFor({ user: ADMIN }), { handle: () => throwError(() => err) });
    await expect(firstValueFrom(run)).rejects.toBe(err);
    expect(writer.push).toHaveBeenCalledWith(expect.objectContaining({ status: 404, entity_id: null }));

    const boom = interceptor.intercept(ctxFor({ user: ADMIN }), { handle: () => throwError(() => new Error('x')) });
    await expect(firstValueFrom(boom)).rejects.toThrow('x');
    expect(writer.push).toHaveBeenLastCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('never fails the request when recording throws', async () => {
    const { interceptor } = setup(() => {
      throw new Error('queue broken');
    });
    const out = await firstValueFrom(interceptor.intercept(ctxFor({ user: ADMIN }), { handle: () => of({ ok: 1 }) }));
    expect(out).toEqual({ ok: 1 });
  });

  it('drops throttled public calls (429) so a flood cannot flood the log', async () => {
    const { writer, interceptor } = setup();
    const tooMany = Object.assign(new NotFoundException(), { getStatus: () => 429 });
    const run = interceptor.intercept(ctxFor({}), { handle: () => throwError(() => tooMany) });
    await expect(firstValueFrom(run)).rejects.toBe(tooMany);
    expect(writer.push).not.toHaveBeenCalled();
  });
});
