import { academySettingsSchema, gateCutoverSchema, gateSwitchSchema } from '@ab/settings';
import { describe, expect, it } from 'vitest';
import { sendGateRoutes as routes } from '..';

describe('sendGateRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'PUT /messages/gate/sending',
      'PUT /messages/gate/auto',
      'PUT /messages/gate/cutover',
    ]);
  });

  it('lets only a settings writer turn a switch, tagged messaging, answering the settings', () => {
    for (const route of Object.values(routes)) {
      expect(route).toMatchObject({
        permissions: ['settings.write'],
        tags: ['messaging'],
        response: academySettingsSchema,
      });
    }
  });

  it('takes the switch body on both switches and the tick body on the cut-over', () => {
    expect([routes.sending.body, routes.auto.body]).toEqual([gateSwitchSchema, gateSwitchSchema]);
    expect(routes.cutover.body).toBe(gateCutoverSchema);
  });

  it('accepts any confirmation text, so OFF is never refused over it', () => {
    expect(routes.sending.body.parse({ on: false, confirmText: 7 })).toEqual({
      on: false,
      confirmText: 7,
    });
    expect(routes.auto.body.safeParse({ on: 'false' }).success).toBe(false);
    expect(routes.cutover.body.safeParse({}).success).toBe(false);
  });
});
