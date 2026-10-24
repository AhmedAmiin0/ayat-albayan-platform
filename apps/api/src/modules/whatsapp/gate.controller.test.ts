import { GATE_CONFIRM_TEXT, SETTING_DEFAULTS } from '@ab/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { SINGLETON_ENTITY_ID } from '../../common/audit/singleton-entity';
import { ADMIN_ID, gateApp } from './gate.test-app';

// PUT /messages/gate/{sending|auto} (docs/26 §2f, 26-P0): ON needs the exact text, OFF never does.
describe('PUT /messages/gate/sending | auto', () => {
  const t = gateApp();
  beforeEach(() => t.reset());

  for (const [sw, key] of [['sending', 'messaging_enabled'], ['auto', 'auto_messages_enabled']] as const) {
    describe(sw, () => {
      it('OFF is always 200: without text, with the wrong text, with the right text', async () => {
        for (const body of [{ on: false }, { on: false, confirmText: 'خطأ' }, { on: false, confirmText: GATE_CONFIRM_TEXT[sw] }]) {
          const res = await t.put(`/messages/gate/${sw}`, body);
          expect(res.statusCode).toBe(200);
          expect(res.json()).toEqual(SETTING_DEFAULTS);
        }
        expect(t.settings.writeSwitch).toHaveBeenCalledTimes(3);
        for (const call of t.settings.writeSwitch.mock.calls) expect(call).toEqual([key, false, ADMIN_ID]);
      });

      it('ON without or with the wrong text → 428 confirmation_required, nothing written or audited', async () => {
        for (const body of [{ on: true }, { on: true, confirmText: 'نعم' }, { on: true, confirmText: GATE_CONFIRM_TEXT[sw === 'auto' ? 'sending' : 'auto'] }]) {
          const res = await t.put(`/messages/gate/${sw}`, body);
          expect(res.statusCode).toBe(428);
          expect(res.json()).toMatchObject({ code: 'confirmation_required' });
        }
        expect(t.settings.writeSwitch).not.toHaveBeenCalled();
        expect(t.audit.record).not.toHaveBeenCalled();
      });

      it('ON with the exact text → 200, writes only its key, audits before/after of that key', async () => {
        const after = { ...SETTING_DEFAULTS, [key]: true };
        t.settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
        const res = await t.put(`/messages/gate/${sw}`, { on: true, confirmText: ` ${GATE_CONFIRM_TEXT[sw]} ` });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(after);
        expect(t.settings.writeSwitch).toHaveBeenCalledExactlyOnceWith(key, true, ADMIN_ID);
        expect(t.audit.record).toHaveBeenCalledWith({
          actorId: ADMIN_ID,
          entity: 'settings',
          entityId: SINGLETON_ENTITY_ID,
          action: `gate_${sw}`,
          before: { [key]: false },
          after: { [key]: true },
        });
      });

      it('a teacher (no settings.write) → 403; a malformed body → 400; nothing written', async () => {
        expect((await t.put(`/messages/gate/${sw}`, { on: false }, 'teacher')).statusCode).toBe(403);
        for (const body of [{}, { on: 'false' }, { on: 1 }, { on: null }]) {
          expect((await t.put(`/messages/gate/${sw}`, body)).statusCode).toBe(400);
        }
        expect(t.settings.writeSwitch).not.toHaveBeenCalled();
      });
    });
  }
});
