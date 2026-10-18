import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { canSubmit, checkTemplateHealth, lineSyncErrorText, moveTemplateLine, otherLine, templateErrorText } from './api';
import { checked } from './template-lines-fixture';
import { phonesOf } from './use-template-lines';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

afterEach(() => apiSend.mockReset());

describe('template routes per number (owner 2026-10-18)', () => {
  it('health posts the line when given, nothing for both', async () => {
    apiSend.mockResolvedValue({ lines: [], templates: [] });
    await checkTemplateHealth('chat');
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/messaging/templates/health', { line: 'chat' });
    await checkTemplateHealth();
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/messaging/templates/health');
  });

  it('move patches the row’s line', async () => {
    apiSend.mockResolvedValue({});
    await moveTemplateLine({ key: 'a b', line: 'notifications' });
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/a%20b/line', { line: 'notifications' });
  });

  it('canSubmit no longer cares about the line; otherLine flips', () => {
    expect(canSubmit({ status: 'missing' })).toBe(true);
    expect(canSubmit({ status: 'rejected' })).toBe(true);
    expect(canSubmit({ status: 'not_submitted' })).toBe(true);
    expect(canSubmit({ status: 'pending' })).toBe(false);
    expect(otherLine('chat')).toBe('notifications');
    expect(otherLine('notifications')).toBe('chat');
  });

  it('allow_list_only and line failures read in words', () => {
    expect(templateErrorText(new ApiError(403, { code: 'allow_list_only' }))).toBe(t.templates.error.allow_list_only);
    expect(lineSyncErrorText({ error: 'kapso_auth' })).toBe(t.templates.error.kapso_auth);
    expect(lineSyncErrorText({ error: 'meta_error', message: 'boom' })).toBe(t.templates.error.meta_error.replace('{message}', 'boom'));
    expect(lineSyncErrorText({ error: 'meta_error' })).toBe(t.templates.error.meta_error.replace('{message}', '—'));
    expect(lineSyncErrorText({})).toBe(t.common.error);
  });

  it('phonesOf keeps only the numbers Meta answered', () => {
    expect(phonesOf(undefined)).toEqual({});
    expect(phonesOf([checked('notifications', '+1 555'), checked('chat', null)])).toEqual({ notifications: '+1 555' });
  });
});
