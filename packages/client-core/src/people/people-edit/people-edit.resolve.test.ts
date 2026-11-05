import { describe, expect, it, vi } from 'vitest';
import {
  attachModel,
  emptyFamily,
  notesFilter,
  notesShown,
  type AttachState,
} from '../../index.js';
import type { FamilyOption } from '@ab/shared';
import { VIEW } from './people-edit.fixtures.js';

// #621 review: a «new» family whose number exists is that family (confirm names it, the move
// goes by its id); notes are the admin's only.

const TEXT = { moveConfirm: 'نقل {student} إلى {family}؟', invalid: 'تحقق' };
const PHONE = '+201000000003';
const TYPED = { name: 'أبو سهيلة', phone_e164: PHONE, tz: 'Africa/Cairo' };
const FRESH = { body: { guardian: TYPED }, name: TYPED.name, id: null, phone: PHONE };
const OTHER: FamilyOption = { id: 'g7', name: 'أم خالد', phone_e164: PHONE, students: [] };

function attach(state: Partial<AttachState>, families: FamilyOption[] | undefined) {
  const set = { search: vi.fn(), choice: vi.fn(), fresh: vi.fn(), invalid: vi.fn() };
  const full = { search: '', choice: null, fresh: emptyFamily('Africa/Cairo'), invalid: [] };
  const move = { mutate: vi.fn(), isPending: false, errorText: null };
  const model = attachModel({
    view: VIEW,
    state: { ...full, ...state },
    set,
    families,
    move,
    text: TEXT,
  });
  return { model, set, move };
}

describe('attachModel: a new family resolved by its number', () => {
  it('«ولي أمر جديد» looks its number up in the picker', () => {
    const t = attach({ fresh: TYPED }, undefined);
    t.model.takeFresh();
    expect(t.set.search).toHaveBeenCalledWith(PHONE);
  });

  it('waits for the lookup before it can be confirmed', () => {
    expect(attach({ choice: FRESH, search: PHONE }, undefined).model.ready).toBe(false);
  });

  it('an existing family with that number: its real name, moved by its id', () => {
    const t = attach({ choice: FRESH, search: PHONE }, [OTHER]);
    expect(t.model.confirmText).toBe('نقل سهيلة إلى أم خالد؟');
    expect(t.model.ready).toBe(true);
    t.model.submit();
    expect(t.move.mutate).toHaveBeenCalledWith({ studentId: 's1', body: { guardian_id: 'g7' } });
  });

  it('no family with it: the typed one is created', () => {
    const t = attach({ choice: FRESH, search: PHONE }, []);
    expect(t.model.confirmText).toBe('نقل سهيلة إلى أبو سهيلة؟');
    t.model.submit();
    expect(t.move.mutate).toHaveBeenCalledWith({ studentId: 's1', body: { guardian: TYPED } });
  });
});

describe('notes (owner 2026-10-27)', () => {
  it('shown only when the API sent them; the filter drops the notes key otherwise', () => {
    const { notes: _n, ...hidden } = VIEW.student;
    expect(notesShown({ ...VIEW, student: { ...VIEW.student, notes: null } })).toBe(true);
    expect(notesShown({ ...VIEW, student: hidden })).toBe(false);
    expect(['name', 'notes'].filter(notesFilter(false))).toEqual(['name']);
    expect(['name', 'notes'].filter(notesFilter(true))).toEqual(['name', 'notes']);
  });
});
