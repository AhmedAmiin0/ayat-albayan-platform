import { describe, expect, it } from 'vitest';
import { senderLine } from './sender.js';

const out = { direction: 'outbound' as const };

describe('senderLine (owner 2026-10-19 #4)', () => {
  it('a teacher’s, an admin’s and a salesperson’s send show the name', () => {
    expect(senderLine({ ...out, sender_name: 'أبرار', sent_by_teacher_name: 'أبرار' })).toEqual({ kind: 'name', name: 'أبرار' });
    expect(senderLine({ ...out, sender_name: 'المدير' })).toEqual({ kind: 'name', name: 'المدير' });
    expect(senderLine({ ...out, sender_name: 'سارة', automatic: false })).toEqual({ kind: 'name', name: 'سارة' });
  });

  it('a job’s message is automatic', () => {
    expect(senderLine({ ...out, sender_name: null, automatic: true })).toEqual({ kind: 'auto' });
  });

  it('imported history and inbound rows show nothing', () => {
    expect(senderLine({ ...out, sender_name: null, automatic: false })).toBeNull();
    expect(senderLine({ direction: 'inbound', sender_name: 'سارة', automatic: true })).toBeNull();
  });

  it('an old cached row with only sent_by_teacher_name still shows the teacher', () => {
    expect(senderLine({ ...out, sent_by_teacher_name: 'أبرار' })).toEqual({ kind: 'name', name: 'أبرار' });
  });
});
