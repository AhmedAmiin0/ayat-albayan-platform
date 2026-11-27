import { describe, expect, it } from 'vitest';
import {
  templateHealthViewSchema, templateLineViewSchema, templateMoveViewSchema, templateSkipSchema,
} from '..';
import { aLineSync } from './template-sync.builder';
import { aTemplateView } from '../../../../testing/templates';

const FACTS = {
  line: 'chat', configured: true, provider: 'meta', waba_id: '1', phone_number_id: '2',
} as const;

describe('template sync views', () => {
  it('parses a line view with and without its last sync', () => {
    const view = { ...FACTS, last_checked_at: null, last_sync: aLineSync() };
    expect(templateLineViewSchema.parse(view)).toEqual(view);
    expect(templateLineViewSchema.parse({ ...view, last_sync: null }).last_sync).toBeNull();
  });

  it('keeps a failed sync with its code and Meta message', () => {
    const failed = aLineSync({ ok: false, error: 'meta_error', message: 'boom', meta_count: 0 });
    const health = { lines: [failed], templates: [aTemplateView()] };
    expect(templateHealthViewSchema.parse(health)).toEqual(health);
  });

  it('answers a move with the row and the new line sync, or none', () => {
    const move = { template: aTemplateView(), sync: null };
    expect(templateMoveViewSchema.parse(move)).toEqual(move);
  });

  it('knows each skip reason and its params', () => {
    const skip = (reason: unknown) => templateSkipSchema.safeParse({ name: 'x', reason }).success;
    expect(skip({ code: 'category', category: 'MARKETING' })).toBe(true);
    expect(skip({ code: 'too_many_vars', max: 5 })).toBe(true);
    expect(skip({ code: 'key_taken' })).toBe(true);
    expect(skip({ code: 'too_many_vars' })).toBe(false);
    expect(skip({ code: 'unknown' })).toBe(false);
  });

  it('refuses an unknown line, provider or an offset-less check time', () => {
    const view = { ...FACTS, last_checked_at: null, last_sync: null };
    expect(templateLineViewSchema.safeParse({ ...view, line: 'sms' }).success).toBe(false);
    expect(templateLineViewSchema.safeParse({ ...view, provider: 'x' }).success).toBe(false);
    const late = { ...view, last_checked_at: '2026-11-27T10:00:00' };
    expect(templateLineViewSchema.safeParse(late).success).toBe(false);
  });
});
