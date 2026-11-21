import { Controller, Get, Logger } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { currentRequestId, REQUEST_ID_HEADER } from './request-id';
import { registerRequestId, requestIdOptions } from './request-id.hook';

const seen: (string | undefined)[] = [];

@Controller('echo')
class EchoController {
  @Get()
  async echo(): Promise<{ id: string | undefined }> {
    await new Promise((r) => setTimeout(r, 1));
    seen.push(currentRequestId());
    new Logger('Echo').log('handled');
    return { id: currentRequestId() };
  }
}

describe('request ids on the real Fastify adapter', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [EchoController] }).compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(requestIdOptions()));
    registerRequestId(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  it('an incoming X-Request-Id is kept, answered back and seen by the handler', async () => {
    const res = await app.inject({ method: 'GET', url: '/echo', headers: { [REQUEST_ID_HEADER]: 'edge-42' } });
    expect(res.headers[REQUEST_ID_HEADER]).toBe('edge-42');
    expect(res.json()).toEqual({ id: 'edge-42' });
  });

  it('none (or a bad one): a new id, the same in the header and the handler', async () => {
    const res = await app.inject({ method: 'GET', url: '/echo', headers: { [REQUEST_ID_HEADER]: 'bad id\n' } });
    const id = res.headers[REQUEST_ID_HEADER];
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.json()).toEqual({ id });
  });

  it('a 404 carries one too', async () => {
    const res = await app.inject({ method: 'GET', url: '/nowhere' });
    expect(res.statusCode).toBe(404);
    expect(res.headers[REQUEST_ID_HEADER]).toBeTruthy();
  });

  it('two requests at once never mix their ids', async () => {
    seen.length = 0;
    const call = (id: string) => app.inject({ method: 'GET', url: '/echo', headers: { [REQUEST_ID_HEADER]: id } });
    const [a, b] = await Promise.all([call('a-1'), call('b-2')]);
    expect([a.json<{ id: string }>().id, b.json<{ id: string }>().id]).toEqual(['a-1', 'b-2']);
    expect(seen.sort()).toEqual(['a-1', 'b-2']);
    vi.restoreAllMocks();
  });
});
