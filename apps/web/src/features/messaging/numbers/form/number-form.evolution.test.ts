import { numberCreateSchema, numberUpdateSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { evolutionPart, evolutionView, numberView } from '@/features/messaging/numbers/numbers.fixture';
import { createBody, draftErrors, draftOf, updateBody } from './number-form';

const evolutionDraft = { ...draftOf(), label: 'Staff', provider: 'evolution' as const, phone_number_id: 'staff-1' };

describe('number-form on Evolution (docs/19 «Evolution driver»)', () => {
  it('an edit starts from the record’s engine and switch', () => {
    const view = evolutionView({ evolution: evolutionPart({ mode: 'cloud', state: null, state_at: null }) });
    expect(draftOf(view)).toMatchObject({ provider: 'evolution', evolution_mode: 'cloud', phone_number_id: 'academy-staff' });
  });

  it('the hidden Meta ids are neither checked nor sent', () => {
    const draft = { ...evolutionDraft, waba_id: 'not an id!', app_id: '3000000001' };
    expect(draftErrors(draft)).toEqual({});
    const body = createBody(draft);
    expect(body).toMatchObject({
      waba_id: null, app_id: null, evolution_mode: 'baileys', evolution_auto_sends: false,
    });
    expect(numberCreateSchema.safeParse(body).success).toBe(true);
  });

  it('automatic sends go out on Baileys only', () => {
    const on = { ...evolutionDraft, evolution_auto_sends: true };
    expect(createBody(on).evolution_auto_sends).toBe(true);
    const cloud = { ...evolutionDraft, evolution_mode: 'cloud' as const, evolution_auto_sends: true };
    expect(createBody(cloud)).toMatchObject({ evolution_mode: 'cloud', evolution_auto_sends: false });
  });

  it('another provider sends no Evolution field on create, and stays valid', () => {
    const body = createBody({ ...draftOf(), label: 'Main', phone_number_id: '1000000001' });
    expect(body.evolution_mode).toBeUndefined();
    expect(body.evolution_auto_sends).toBeUndefined();
    expect(numberCreateSchema.safeParse(body).success).toBe(true);
  });

  it('updateBody: only the changed switch; leaving Evolution sends evolution_mode null', () => {
    const view = evolutionView();
    expect(updateBody(view, draftOf(view))).toEqual({});
    const on = { ...draftOf(view), evolution_auto_sends: true };
    expect(updateBody(view, on)).toEqual({ evolution_auto_sends: true });
    const toMeta = updateBody(view, { ...draftOf(view), provider: 'meta', phone_number_id: '1000000009' });
    expect(toMeta).toEqual({ provider: 'meta', phone_number_id: '1000000009', evolution_mode: null });
    expect(numberUpdateSchema.safeParse(toMeta).success).toBe(true);
  });

  it('updateBody: moving a Meta number to Evolution sends the engine and clears its Meta ids', () => {
    const body = updateBody(numberView(), { ...draftOf(numberView()), provider: 'evolution', phone_number_id: 'staff-1' });
    expect(body).toEqual({
      provider: 'evolution', phone_number_id: 'staff-1', waba_id: null, evolution_mode: 'baileys', evolution_auto_sends: false,
    });
  });
});
