import { describe, expect, it } from 'vitest';
import {
  headerOk,
  importButtons,
  isStarterCategory,
  varCount,
} from '@/modules/messaging/whatsapp/templates/sync/import-checks';
import { components } from '@/modules/messaging/whatsapp/templates/sync/template-sync';

describe('the import checks on a WABA template', () => {
  it('isStarterCategory: a known category but authentication', () => {
    expect(['marketing', 'utility'].map(isStarterCategory)).toEqual([true, true]);
    expect(['authentication', 'other'].map(isStarterCategory)).toEqual([false, false]);
  });

  it('varCount: the highest numbered variable; null for a named one', () => {
    expect(varCount('بدون متغيرات')).toBe(0);
    expect(varCount('{{2}} ثم {{1}}')).toBe(2);
    expect(varCount('{{ 3 }}')).toBe(3);
    expect(varCount('{{name}}')).toBeNull();
  });

  it('headerOk: none, or a plain text header without a variable', () => {
    expect(headerOk(components([]))).toBe(true);
    expect(headerOk(components([{ type: 'HEADER', format: 'TEXT', text: 'مرحبًا' }]))).toBe(true);
    expect(headerOk(components([{ type: 'HEADER', format: 'TEXT', text: '{{1}}' }]))).toBe(false);
    expect(headerOk(components([{ type: 'HEADER', format: 'IMAGE' }]))).toBe(false);
  });

  it('importButtons: none needs a value → []; a copy-code button → null', () => {
    const phone = { type: 'BUTTONS', buttons: [{ type: 'PHONE_NUMBER', text: 'اتصل' }] };
    expect(importButtons(components([phone]))).toEqual([]);
    const code = { type: 'BUTTONS', buttons: [{ type: 'COPY_CODE', text: 'انسخ' }] };
    expect(importButtons(components([code]))).toBeNull();
    expect(importButtons(components([]))).toEqual([]);
  });
});
