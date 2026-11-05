import { describe, expect, it } from 'vitest';
import { dueActivations, legacyStudents } from './course-due.rules';

const NOW = new Date('2026-11-06T12:00:00.000Z');

describe('course due rules (owner 2026-11-06)', () => {
  it('a package active for 2 h or more is due; a newer one waits', () => {
    const rows = [
      { entity_id: 'old', at: '2026-11-06T09:00:00.000Z' },
      { entity_id: 'edge', at: '2026-11-06T10:00:00.000Z' },
      { entity_id: 'new', at: '2026-11-06T11:30:00.000Z' },
    ];
    expect(dueActivations(rows, NOW)).toEqual(['old', 'edge']);
  });

  it('the latest activation counts (active again an hour ago: not yet)', () => {
    const rows = [
      { entity_id: 's', at: '2026-11-06T11:00:00.000Z' },
      { entity_id: 's', at: '2026-11-01T11:00:00.000Z' },
    ];
    expect(dueActivations(rows, NOW)).toEqual([]);
  });

  it('a running imported weekly course keeps its student out; a trial, a makeup or an ended one do not', () => {
    const rule = { starts_on: '2026-01-01', ends_on: null, package: '8' };
    const set = legacyStudents(
      [
        { ...rule, student_id: 'running' },
        { ...rule, student_id: 'trial', package: 'trial' },
        { ...rule, student_id: 'makeup', starts_on: '2026-11-07', ends_on: '2026-11-07' },
        { ...rule, student_id: 'ended', ends_on: '2026-11-01' },
        { ...rule, student_id: 'today', ends_on: '2026-11-06' },
      ],
      '2026-11-06',
    );
    expect([...set]).toEqual(['running', 'today']);
  });
});
