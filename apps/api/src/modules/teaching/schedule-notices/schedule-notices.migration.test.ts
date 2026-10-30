import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUSH_KINDS, TEMPLATE_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { NOTICE_KEYS } from './notice.types';

// Migration 988 (owner 2026-10-30). No database runs in unit tests: this pins its shape and the
// owner's exact bodies (the ones he pastes into the CRM).
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261030000988_schedule_change_notices.sql'), 'utf8');
const code = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');

const BODIES: Record<(typeof NOTICE_KEYS)[number], string> = {
  lesson_rescheduled:
    'السلام عليكم {{1}}،\nتم تغيير موعد حلقة {{2}}.\nالموعد السابق: {{3}}\nالموعد الجديد: {{4}}\nأكاديمية آيات البيان',
  lesson_cancelled:
    'السلام عليكم {{1}}،\nتم إلغاء حلقة {{2}} المحددة في {{3}}.\nللاستفسار يسعدنا تواصلكم معنا.\nأكاديمية آيات البيان',
  course_paused:
    'السلام عليكم {{1}}،\nتم إيقاف حلقات {{2}} مؤقتًا ابتداءً من {{3}}.\nسنبلغكم عند استئنافها.\nأكاديمية آيات البيان',
  course_resumed: 'السلام عليكم {{1}}،\nتم استئناف حلقات {{2}}، وأول حلقة في {{3}}.\nأكاديمية آيات البيان',
};

describe('migration 988: the schedule-change notices', () => {
  it('adds the four push kinds re-runnably', () => {
    for (const key of NOTICE_KEYS) {
      expect(code).toContain(`alter type public.push_kind add value if not exists '${key}';`);
      expect(PUSH_KINDS).toContain(key);
      expect(TEMPLATE_KEYS).toContain(key);
    }
  });

  it('seeds each template with the owner’s exact body: Arabic, utility, notifications line, not submitted', () => {
    for (const key of NOTICE_KEYS) {
      expect(code).toContain(`('${key}', '${key}', 'ar', 'utility', 'notifications', 'not_submitted',`);
      expect(code).toContain(`'${BODIES[key]}'`);
    }
    expect(code).not.toMatch(/'(approved|pending)'/);
    // Any unique key (key, or (meta_name, language) from migration 141) keeps the row: never a failure.
    expect(code).toContain('on conflict do nothing;');
    expect(code).not.toMatch(/on conflict \(key\)/);
  });
});
