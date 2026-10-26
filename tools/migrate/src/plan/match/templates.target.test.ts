// Templates already in the target are planned as updates with their field changes (invented rows).
import { describe, expect, it } from 'vitest';
import { recordHash } from '../../hash.ts';
import { keys } from '../../keys.ts';
import type { Existing } from '../../types.ts';
import { diffPlan } from '../diff.ts';
import { fakeDb } from '../fake-db.ts';
import type { Desired } from '../resolve.ts';
import { matchTemplates, templateChanges } from './templates.target.ts';

function template(name: string, body: string): Desired {
  const columns = {
    key: name,
    meta_name: name,
    language: 'ar',
    body_ar: body,
    buttons: [{ type: 'QUICK_REPLY', text: 'تمام' }],
    status: 'approved',
    footer_ar: null,
    meta_id: '42',
  };
  const record = { columns, refs: {} };
  return {
    key: keys.messageTemplate(name),
    record,
    hash: recordHash(record),
    ref: { source: 'CRM', tab: 'message_templates', row: 0 },
  };
}

const seeded = {
  meta_name: 'lesson_reminder',
  language: 'ar',
  row: {
    body_ar: 'نص قديم',
    buttons: [{ type: 'QUICK_REPLY', text: 'تمام' }],
    status: 'pending',
    footer_ar: null,
    meta_id: '42',
  },
};

describe('templates already in the target', () => {
  it('become updates listing only the Meta-owned fields that change', () => {
    const existing = new Map<string, Existing>();
    const fresh = [template('lesson_reminder', 'نص جديد'), template('new_one', 'x')];
    const changes = templateChanges({ fresh, rows: [seeded], existing });
    expect(changes.map((c) => [c.key, c.field, c.from, c.to])).toEqual([
      ['lesson_reminder', 'status', 'pending', 'approved'],
      ['lesson_reminder', 'body_ar', 'نص قديم', 'نص جديد'],
    ]);
    const plan = diffPlan({ desired: fresh, existing });
    expect(plan.items.map((i) => [i.key.key, i.action])).toEqual([
      ['lesson_reminder', 'update'],
      ['new_one', 'create'],
    ]);
  });

  it('a target without the table (staging before Phase 4) plans creates', async () => {
    const missing = Object.assign(new Error('relation does not exist'), { code: '42P01' });
    const { db } = fakeDb({
      select: () => {
        throw missing;
      },
    });
    const existing = new Map<string, Existing>();
    expect(await matchTemplates({ db, desired: [template('x', 'y')], existing })).toEqual([]);
    expect(existing.size).toBe(0);
  });
});
