import { SETTING_DEFAULTS } from '@ab/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_ID, gateApp } from './gate.test-app';

// OFF is always accepted (docs/26 §2f): only the write itself may fail the request.
describe('gate routes when a read or the audit fails', () => {
  const t = gateApp();
  beforeEach(() => t.reset());

  it('a failed read before the write never refuses OFF', async () => {
    t.settings.all.mockRejectedValue(new Error('db down'));
    const res = await t.put('/messages/gate/sending', { on: false });
    expect(res.statusCode).toBe(200);
    expect(t.settings.writeSwitch).toHaveBeenCalledExactlyOnceWith('messaging_enabled', false, ADMIN_ID);
    expect(res.json()).toMatchObject({ messaging_enabled: false });
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ before: { messaging_enabled: null }, after: { messaging_enabled: false } }),
    );
  });

  it('a failed audit after the write still answers 200 with the saved value', async () => {
    t.audit.record.mockRejectedValue(new Error('audit down'));
    const res = await t.put('/messages/gate/auto', { on: false });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...SETTING_DEFAULTS, auto_messages_enabled: false });
  });

  it('OFF ignores a confirmText of any shape; ON still needs the exact string', async () => {
    for (const confirmText of ['x'.repeat(300), 7, ['a'], null]) {
      expect((await t.put('/messages/gate/sending', { on: false, confirmText })).statusCode).toBe(200);
      expect((await t.put('/messages/gate/sending', { on: true, confirmText })).statusCode).toBe(428);
    }
    expect(t.settings.writeSwitch).not.toHaveBeenCalledWith('messaging_enabled', true, ADMIN_ID);
  });

  it('a failed write is the one error that fails the request', async () => {
    t.settings.writeSwitch.mockRejectedValue(new Error('write failed'));
    expect((await t.put('/messages/gate/sending', { on: false })).statusCode).toBe(500);
  });
});
