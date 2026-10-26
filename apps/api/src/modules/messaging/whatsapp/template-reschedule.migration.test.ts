import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RESTRICTED_TEMPLATE_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migration 460 (owner 2026-10-18). No database runs in unit tests: this pins the shape.
const dir = join(__dirname, '../../../../../../packages/db/supabase/migrations');
const sql = readFileSync(join(dir, '20261018000460_template_reschedule.sql'), 'utf8');

describe('migration 20261018000460: the reschedule starter and the line comment', () => {
  it('seeds trial_reschedule on the chat line, not submitted, on the allow-list, with contact_name', () => {
    expect(sql).toContain(
      "values (\n  'trial_reschedule',\n  'trial_reschedule',\n  'ar',\n  'utility',\n  'السلام عليكم {{1}}،\nنودّ إعادة جدولة موعد الحلقة التجريبية.\nما الوقت الذي يناسبكم؟',\n  '[\"contact_name\"]'::jsonb,\n  'not_submitted',\n  'chat',\n  true\n)\non conflict do nothing;",
    );
  });

  it('trial_reschedule is one of the three restricted defaults', () => {
    expect(RESTRICTED_TEMPLATE_DEFAULTS).toEqual(['free_trial_invite', 'welcome_greeting', 'trial_reschedule']);
  });

  it('restates the line column comment (the admin sets it now), never editing migration 340', () => {
    expect(sql).toMatch(/comment on column public\.message_templates\.line is\s+'WhatsApp line \(WABA\) this template is on;[^']*by the admin \(PATCH \/messaging\/templates\/:key\/line, audited\)/);
    expect(sql).not.toContain('Written by the health sync');
  });

  it('never submits anything: no Meta call, the status stays not_submitted', () => {
    expect(sql).not.toMatch(/status\s*=\s*'(pending|approved)'/);
  });
});
