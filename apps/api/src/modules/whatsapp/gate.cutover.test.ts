import { SETTING_DEFAULTS } from '@ab/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ADMIN_ID, gateApp } from './gate.test-app';

// PUT /messages/gate/cutover: the one writer of crm_cutover_done now that PATCH /settings moves it.
describe('PUT /messages/gate/cutover', () => {
  const t = gateApp();
  beforeEach(() => t.reset());

  it('writes crm_cutover_done either way without confirmation and audits gate_cutover', async () => {
    const after = { ...SETTING_DEFAULTS, crm_cutover_done: true };
    t.settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
    const res = await t.put('/messages/gate/cutover', { done: true });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(after);
    expect(t.settings.writeSwitch).toHaveBeenCalledExactlyOnceWith('crm_cutover_done', true, ADMIN_ID);
    expect(t.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'gate_cutover', before: { crm_cutover_done: false }, after: { crm_cutover_done: true } }),
    );
    expect((await t.put('/messages/gate/cutover', { done: false })).statusCode).toBe(200);
    expect(t.settings.writeSwitch).toHaveBeenLastCalledWith('crm_cutover_done', false, ADMIN_ID);
  });

  it('403 for a teacher, 400 for a malformed body', async () => {
    expect((await t.put('/messages/gate/cutover', { done: true }, 'teacher')).statusCode).toBe(403);
    expect((await t.put('/messages/gate/cutover', { done: 'yes' })).statusCode).toBe(400);
    expect((await t.put('/messages/gate/cutover', { on: true })).statusCode).toBe(400);
    expect(t.settings.writeSwitch).not.toHaveBeenCalled();
  });
});
