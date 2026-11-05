import { describe, expect, it, vi } from 'vitest';
import {
  allowedPeopleActions,
  attachModel,
  convertDone,
  convertModel,
  emptyFamily,
  type AttachState,
} from '../../index.js';
import type { Permission } from '@ab/shared';
import { VIEW } from './people-edit.fixtures.js';

const write = () => ({ mutate: vi.fn(), isPending: false, errorText: null as string | null });
const TEXT = { moveConfirm: 'نقل {student} إلى {family}؟', invalid: 'تحقق' };
const CONVERT = {
  saved: 'حُفظ',
  toStudentConfirm: 'إضافة {name}؟',
  toGuardianConfirm: 'حذف {name}؟',
  toStudentDone: 'الكود {code}',
  toGuardianDone: '{name} ولي أمر',
};

function attach(
  state: Partial<AttachState>,
  families = [{ id: 'g2', name: 'أبو خالد', phone_e164: '+201000000009', students: [] }],
) {
  const set = { search: vi.fn(), choice: vi.fn(), fresh: vi.fn(), invalid: vi.fn() };
  const full: AttachState = {
    search: '',
    choice: null,
    fresh: emptyFamily('Africa/Cairo'),
    invalid: [],
    ...state,
  };
  const move = write();
  return {
    model: attachModel({ view: VIEW, state: full, set, families, move, text: TEXT }),
    set,
    move,
  };
}

describe('allowedPeopleActions', () => {
  it('needs people.edit for all three', () => {
    const held = (keys: Permission[]) => (p: Permission) => keys.includes(p);
    expect(
      allowedPeopleActions(held(['people.edit', 'students.attach_guardian', 'people.switch_role'])),
    ).toEqual(['edit', 'attach', 'convert']);
    expect(allowedPeopleActions(held(['students.attach_guardian', 'people.switch_role']))).toEqual(
      [],
    );
  });
});

describe('attachModel', () => {
  it('results from two characters; a pick is confirmed then submitted', () => {
    expect(attach({ search: 'a' }).model.results).toBeNull();
    const { model, set } = attach({ search: 'أبو' });
    expect(model.results).toHaveLength(1);
    model.pick({ id: 'g2', name: 'أبو خالد', phone_e164: '+201000000009', students: [] });
    expect(set.choice).toHaveBeenCalledWith({
      body: { guardian_id: 'g2' },
      name: 'أبو خالد',
      id: 'g2',
    });
    const chosen = attach({ choice: { body: { guardian_id: 'g2' }, name: 'أبو خالد', id: 'g2' } });
    expect(chosen.model.confirmText).toBe('نقل سهيلة إلى أبو خالد؟');
    chosen.model.submit();
    expect(chosen.move.mutate).toHaveBeenCalledWith({
      studentId: 's1',
      body: { guardian_id: 'g2' },
    });
  });

  it('a new guardian: parsed or its bad fields marked; nothing submitted without a choice', () => {
    const bad = attach({ fresh: { name: '', phone_e164: '0100', tz: 'Africa/Cairo' } });
    bad.model.takeFresh();
    expect(bad.set.choice).toHaveBeenCalledWith(null);
    bad.model.submit();
    expect(bad.move.mutate).not.toHaveBeenCalled();
    const ok = attach({
      fresh: { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' },
    });
    ok.model.takeFresh();
    expect(ok.set.choice).toHaveBeenCalledWith({
      body: { guardian: { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' } },
      name: 'أبو سهيلة',
      id: null,
      phone: '+201000000003',
    });
    expect(attach({ search: 'zz' }, []).model.empty).toBe(true);
  });
});

describe('convertModel / convertDone', () => {
  it('each conversion confirms its own sentence and runs on its record', () => {
    const writes = { self: write(), toStudent: write(), toGuardian: write() };
    const ask = vi.fn();
    const student = convertModel({ view: VIEW, pending: 'toStudent', ask, writes, text: CONVERT });
    expect(student.confirm?.text).toBe('إضافة أم سهيلة؟');
    student.confirm?.run();
    expect(writes.toStudent.mutate).toHaveBeenCalledWith('g1');
    convertModel({ view: VIEW, pending: 'toGuardian', ask, writes, text: CONVERT }).confirm?.run();
    expect(writes.toGuardian.mutate).toHaveBeenCalledWith('s1');
    writes.toGuardian.errorText = 'رفض';
    expect(convertModel({ view: VIEW, pending: null, ask, writes, text: CONVERT })).toMatchObject({
      confirm: null,
      error: 'رفض',
    });
  });

  it('the notices; «تحويل إلى ولي أمر» says the student row is gone', () => {
    const onDone = vi.fn();
    const done = convertDone(VIEW, onDone, CONVERT);
    done.toStudent({ id: 's9', code: 'AB-0300' });
    done.toGuardian();
    expect(onDone.mock.calls).toEqual([['الكود AB-0300'], ['سهيلة ولي أمر', true]]);
  });
});
