import { describe, expect, it } from 'vitest';
import { evolutionStateOf, QR_DATA_URL_RE } from './evolution.js';
import { numberCreateSchema, numberUpdateSchema } from './schemas.js';

// docs/19 «Evolution driver»: an Evolution number names its engine; nothing else carries one.

const base = { label: 'رقم ثانوي', purpose: 'chat', phone_number_id: 'secondary-1' };

describe('Evolution number fields', () => {
  it('provider evolution needs baileys or cloud; another provider takes none', () => {
    expect(numberCreateSchema.safeParse({ ...base, provider: 'evolution' }).success).toBe(false);
    expect(numberCreateSchema.parse({ ...base, provider: 'evolution', evolution_mode: 'baileys' }))
      .toMatchObject({ provider: 'evolution', evolution_mode: 'baileys', enabled: false });
    expect(numberCreateSchema.safeParse({ ...base, evolution_mode: 'cloud' }).success).toBe(false);
    const web = { ...base, provider: 'evolution', evolution_mode: 'web' };
    expect(numberCreateSchema.safeParse(web).success).toBe(false);
  });

  it('an update may switch the automatic-sends flag or the engine alone', () => {
    const auto = { evolution_auto_sends: true };
    expect(numberUpdateSchema.parse(auto)).toEqual(auto);
    expect(numberUpdateSchema.parse({ evolution_mode: null })).toEqual({ evolution_mode: null });
  });

  it('states and QR images are read strictly', () => {
    expect(evolutionStateOf('open')).toBe('open');
    expect(evolutionStateOf('bogus')).toBeNull();
    expect(QR_DATA_URL_RE.test('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(QR_DATA_URL_RE.test('https://example.test/qr.png')).toBe(false);
    expect(QR_DATA_URL_RE.test('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
  });
});
