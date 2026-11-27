import { describe, expect, it } from 'vitest';
import { GATE_CONFIRM_TEXT, SETTING_DEFAULTS, gateRoutes as routes } from '../..';

const write = { permissions: ['settings.write'], tags: ['messaging'] };

describe('gateRoutes', () => {
  it('keeps the method, path, permission and tag of each send-gate switch', () => {
    expect(routes.sending).toMatchObject({ method: 'PUT', path: '/messages/gate/sending', ...write });
    expect(routes.auto).toMatchObject({ method: 'PUT', path: '/messages/gate/auto', ...write });
    expect(routes.cutover).toMatchObject({ method: 'PUT', path: '/messages/gate/cutover', ...write });
  });

  it('takes a switch with or without its confirmation text, and refuses one without on', () => {
    const on = { on: true, confirmText: GATE_CONFIRM_TEXT.sending };
    expect(routes.sending.body.parse(on)).toEqual(on);
    expect(routes.auto.body.parse({ on: false })).toEqual({ on: false });
    expect(routes.sending.body.safeParse({ confirmText: 'x' }).success).toBe(false);
  });

  it('takes the cut-over tick only as a boolean', () => {
    expect(routes.cutover.body.parse({ done: true })).toEqual({ done: true });
    expect(routes.cutover.body.safeParse({ done: 'yes' }).success).toBe(false);
  });

  it('answers the full academy settings on every switch', () => {
    expect(routes.sending.response.parse(SETTING_DEFAULTS)).toEqual(SETTING_DEFAULTS);
    expect(routes.cutover.response.safeParse({ messaging_enabled: true }).success).toBe(false);
  });
});
