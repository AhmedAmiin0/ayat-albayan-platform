import { describe, expect, it } from 'vitest';
import { syncScope, visibleTo } from './sync-scope';

const teacher = (phones: string[]) => ({
  kind: 'teacher' as const,
  scope: { teacherId: 't', teacherName: 'x', phones: new Set(phones), ownPhone: null },
});
const plain = { template_key: null, interactive_payload: null };
const link = { template_key: 'lesson_join_link', interactive_payload: null };
const marker = {
  template_key: null,
  interactive_payload: { type: 'edit', target: 'x', text: 'y' },
};

describe('sync scope', () => {
  it('who may hold which row', () => {
    expect([
      visibleTo('admin', link),
      visibleTo('teacher', link),
      visibleTo('sales', link),
    ]).toEqual([true, true, false]);
    for (const kind of ['admin', 'sales', 'teacher'] as const) {
      expect(visibleTo(kind, plain)).toBe(true);
      expect(visibleTo(kind, marker)).toBe(false);
    }
  });

  it('the key: per role, order-free, moves with phones and own numbers, carries no phone', () => {
    const a = syncScope(teacher(['+966500000002', '+966500000001']), new Set());
    const b = syncScope(teacher(['+966500000001', '+966500000002']), new Set());
    expect(a).toEqual(b);
    expect(a.phones).toEqual(['+966500000001', '+966500000002']);
    expect(syncScope(teacher(['+966500000001']), new Set()).key).not.toBe(a.key);
    const admin = syncScope({ kind: 'admin' }, new Set(['+966500000009']));
    expect(admin).toMatchObject({ phones: null, hide: ['+966500000009'] });
    expect(admin.key).not.toBe(syncScope({ kind: 'sales' }, new Set(['+966500000009'])).key);
    expect(admin.key).not.toContain('966');
  });
});
