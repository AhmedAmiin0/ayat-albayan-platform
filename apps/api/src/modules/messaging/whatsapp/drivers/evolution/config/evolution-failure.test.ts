import { ConflictException, HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionFailure } from './evolution-failure';

// Review fix 13: a refused value is evolution_rejected with Evolution's message, not
// «unreachable»; review fix 9: a save that was not pushed says so.

const body = (e: unknown): unknown => (e instanceof HttpException ? e.getResponse() : null);
const status = (e: unknown): number => (e instanceof HttpException ? e.getStatus() : 0);

describe('evolutionFailure', () => {
  it('a refused key is evolution_auth', () => {
    const e = new WaError('x', { code: null, status: 401, credential: 'evolution' });
    expect(body(evolutionFailure(e))).toMatchObject({ code: 'evolution_auth' });
    expect(status(evolutionFailure(e))).toBe(502);
  });

  it('a 4xx invalid parameter is evolution_rejected, with Evolution\'s own words', () => {
    const e = new WaError('x', { code: 100, status: 400, details: 'number is required' });
    expect(body(evolutionFailure(e))).toEqual({
      code: 'evolution_rejected', message: 'evolution_rejected', detail: 'number is required',
    });
  });

  it('a 5xx, a timeout or a lost connection is evolution_unreachable', () => {
    const e = new WaError('x', { code: null, status: 0, uncertain: true });
    expect(body(evolutionFailure(e))).toMatchObject({ code: 'evolution_unreachable' });
  });

  it('after a save: the answer says saved (502 and our own 409 alike)', () => {
    const e = new WaError('x', { code: null, status: 0 });
    expect(body(evolutionFailure(e, true))).toMatchObject({ code: 'evolution_unreachable', saved: true });
    const ours = new ConflictException({ code: 'evolution_not_configured', message: 'x' });
    const out = evolutionFailure(ours, true);
    expect(status(out)).toBe(409);
    expect(body(out)).toMatchObject({ code: 'evolution_not_configured', saved: true });
    expect(evolutionFailure(ours)).toBe(ours);
  });
});
