import { describe, expect, it } from 'vitest';
import { renderTemplateBody } from './templates/render.js';
import { templateStarterSchema, threadTemplateSchema } from './schemas.js';
import { BODY_SLOTS } from './templates/templates.js';

// Starter templates (owner 2026-10-12, docs/12 §13.18): any registry key, up to nine variables.

const nine = Object.fromEntries(BODY_SLOTS.map((s) => [s, `v${s}`]));

describe('threadTemplateSchema', () => {
  it('accepts a key imported from Meta (its Meta name) with up to nine variables', () => {
    const r = threadTemplateSchema.safeParse({ key: 'academy_welcome', params: nine });
    expect(r.success && r.data.params).toEqual(nine);
    expect(threadTemplateSchema.safeParse({ key: 'booking_confirmation', params: {} }).success).toBe(true);
  });

  it.each(['Bad Key!', 'Academy', '', 'a'.repeat(513)])('refuses the key %j', (key) => {
    expect(threadTemplateSchema.safeParse({ key, params: {} }).success).toBe(false);
  });

  it('a tenth position is not a variable: it is dropped, never sent', () => {
    const r = threadTemplateSchema.safeParse({ key: 'academy_welcome', params: { '1': 'a', '10': 'b' } });
    expect(r.success && r.data.params).toEqual({ '1': 'a' });
  });
});

describe('templateStarterSchema', () => {
  it('takes the flag only', () => {
    expect(templateStarterSchema.safeParse({ sales_starter: false }).success).toBe(true);
    expect(templateStarterSchema.safeParse({ sales_starter: 'yes' }).success).toBe(false);
    expect(templateStarterSchema.safeParse({}).success).toBe(false);
  });
});

describe('renderTemplateBody beyond three variables', () => {
  it('fills {{4}}…{{9}}; {{10}} stays visible', () => {
    expect(renderTemplateBody('{{1}} {{4}} {{9}} {{10}}', { '1': 'أ', '4': 'د', '9': 'ط' })).toBe('أ د ط {{10}}');
  });
});
