// SHEET_MODULES: one module per sheet entity, nothing the CRM builder owns, safe on an empty cache.
import { describe, expect, it } from 'vitest';
import { mapAll } from '../../plan/run.ts';
import { bundleOf } from './fixtures.ts';
import { SHEET_MODULES } from './modules.ts';

describe('SHEET_MODULES', () => {
  it('covers each sheet entity once and leaves leads/templates/messages to the CRM side', () => {
    const entities = SHEET_MODULES.map((m) => m.entity);
    expect(new Set(entities).size).toBe(entities.length);
    expect(entities).not.toContain('leads');
    expect(entities).not.toContain('message_templates');
    expect(entities).not.toContain('messages');
    expect(entities).toContain('report_pdfs');
  });

  it('maps an empty bundle to nothing', () => {
    expect(mapAll(bundleOf({}), SHEET_MODULES)).toEqual({ desired: [], issues: [] });
  });

  it('writes go through custom write() where the default insert cannot', () => {
    const custom = SHEET_MODULES.filter((m) => m.write).map((m) => m.entity);
    expect(custom.sort()).toEqual([
      'lesson_reports',
      'lesson_students',
      'report_pdfs',
      'schedule_rule_students',
      'students',
    ]);
  });
});
