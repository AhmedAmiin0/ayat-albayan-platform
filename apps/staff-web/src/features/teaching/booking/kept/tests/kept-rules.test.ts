import { describe, expect, it } from 'vitest';
import { emptyDraft } from '@/features/teaching/booking/draft/draft';
import { isUnfinished, keptKey } from '@/features/teaching/booking/kept/kept-rules';

describe('keptKey', () => {
  it('gives each entry of /admin/book its own draft', () => {
    const keys = [
      keptKey({}),
      keptKey({ studentId: 's-1' }),
      keptKey({ studentId: 's-1', kind: 'makeup', missedLessonId: 'l-9' }),
      keptKey({ leadId: 'lead-1', pkg: 'trial' }),
      keptKey({ leadId: 'lead-1', pkg: '8' }),
      keptKey({ teacherId: 't-1', startsAt: '2026-10-04T14:00:00.000Z' }),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('is the same for the same search, whatever the name or phone typed', () => {
    expect(keptKey({ leadId: 'lead-1', name: 'a', phone: '+1' })).toBe(
      keptKey({ leadId: 'lead-1' }),
    );
  });
});

describe('isUnfinished', () => {
  const fresh = emptyDraft({ kind: 'trial' });

  it('is false while the wizard shows what it opened with', () => {
    expect(isUnfinished(fresh, { draft: fresh, step: 'students', booked: false })).toBe(false);
  });

  it('ignores the request id and the key order of a draft read back from storage', () => {
    const { kind, ...rest } = fresh;
    const readBack = { ...rest, kind, requestId: 'other' };
    expect(isUnfinished(fresh, { draft: readBack, step: 'students', booked: false })).toBe(false);
  });

  it('is true once a field or the step moved', () => {
    const typed = { ...fresh, meetingLink: 'https://meet.example/x' };
    expect(isUnfinished(fresh, { draft: typed, step: 'students', booked: false })).toBe(true);
    expect(isUnfinished(fresh, { draft: fresh, step: 'teacher', booked: false })).toBe(true);
  });

  it('is false once booked', () => {
    expect(isUnfinished(fresh, { draft: fresh, step: 'review', booked: true })).toBe(false);
  });
});
