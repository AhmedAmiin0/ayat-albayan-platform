import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { syncCodeText, syncErrorText, syncResultText } from './template-sync-text';

const s = t.numbers.templateSync;
const failed = (text: string) => s.failed.replace('{{error}}', text);

/** Every code POST /admin/numbers/:id/templates/sync can answer (refused, or as a failed sync). */
const CODES = [
  'module_mode_only',
  'template_sync_off',
  'unknown_number',
  'not_configured',
  'crm_managed',
  'evolution_no_templates',
  'calls_no_templates',
  'allow_list_only',
  'forbidden',
  'meta_error',
  'kapso_auth',
  'crm_auth',
  'crm_scope_missing',
] as const;

describe('the number card’s sync in words', () => {
  it.each(CODES)('%s has its own sentence, never «حدث خطأ»', (code) => {
    expect(s.errors[code]).toBeTruthy();
    expect(syncCodeText(code)).not.toContain(t.numbers.errors.generic);
  });

  it('a refused call reads its code; Nest’s 403 its message; the missing scope is named', () => {
    expect(
      syncErrorText(new ApiError(409, { code: 'module_mode_only', message: 'module_mode_only' })),
    ).toBe(failed(s.errors.module_mode_only));
    expect(syncErrorText(new ApiError(403, { code: 'allow_list_only' }))).toBe(
      failed(s.errors.allow_list_only),
    );
    expect(syncErrorText(new ApiError(403, { message: 'forbidden' }))).toBe(
      failed(s.errors.forbidden),
    );
    expect(
      syncErrorText(new ApiError(502, { code: 'crm_scope_missing', scope: 'templates:read' })),
    ).toContain('templates:read');
    expect(syncErrorText(new Error('down'))).toBe(failed(t.numbers.errors.generic));
  });

  it('a sync says what it found, naming the line when the line’s sync ran', () => {
    expect(syncResultText({ ok: true, meta_count: 12, synced: 7 })).toBe(
      s.done.replace('{{meta}}', '12').replace('{{synced}}', '7'),
    );
    expect(syncResultText({ ok: true, meta_count: 4, synced: 2, line: 'chat' })).toBe(
      s.doneLine
        .replace('{{line}}', t.enums.waLine.chat)
        .replace('{{meta}}', '4')
        .replace('{{synced}}', '2'),
    );
  });

  it('a failed sync names its reason; Meta’s message is kept; an unknown code is generic', () => {
    expect(syncResultText({ ok: false, error: 'not_configured', meta_count: 0, synced: 0 })).toBe(
      failed(s.errors.not_configured),
    );
    expect(
      syncResultText({ ok: false, error: 'meta_error', message: 'boom', meta_count: 0, synced: 0 }),
    ).toContain('boom');
    expect(syncResultText({ ok: false, error: 'other', meta_count: 0, synced: 0 })).toContain(
      t.numbers.errors.generic,
    );
  });
});
