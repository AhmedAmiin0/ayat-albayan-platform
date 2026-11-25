import { shouldSave } from '@ab/shared';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_STORE, savesNow, subscribeOnline } from './draft-rules';

const BODY = '{"notes":"أحسنت"}';

describe('the unchanged-body rule', () => {
  it('autosave skips a body the server already has', () => {
    const settled = { enabled: true, settled: BODY, saved: BODY, failed: null, pending: false };
    expect(shouldSave(settled)).toBe(false);
  });

  it('a press on «save draft» sends it anyway', () => {
    expect(savesNow({ enabled: true, pending: false })).toBe(true);
  });

  it('a press sends nothing while a save is in flight or the report is sent', () => {
    expect(savesNow({ enabled: true, pending: true })).toBe(false);
    expect(savesNow({ enabled: false, pending: false })).toBe(false);
  });
});

describe('subscribeOnline', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('calls back when the device is online again, not when it goes offline', () => {
    const listener = vi.fn();
    const off = subscribeOnline(listener);
    onlineManager.setOnline(false);
    expect(listener).not.toHaveBeenCalled();
    onlineManager.setOnline(true);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('NO_STORE', () => {
  it('keeps nothing and never fails', async () => {
    const kept = { body: BODY, base: '{}' };
    await expect(NO_STORE.keep('r-1', kept)).resolves.toBeUndefined();
    await expect(NO_STORE.drop('r-1')).resolves.toBeUndefined();
    await expect(NO_STORE.dropIfRefused('r-1', new Error('x'))).resolves.toBeUndefined();
  });
});
