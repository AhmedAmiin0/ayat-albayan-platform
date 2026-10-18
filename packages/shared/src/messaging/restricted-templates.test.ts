import { describe, expect, it } from 'vitest';
import { isPermission } from '../permissions/catalog.js';
import {
  ALL_TEMPLATES_PERMISSIONS,
  OWN_BUTTON_TEMPLATES,
  RESTRICTED_TEMPLATE_DEFAULTS,
  restrictedMay,
  sendsAllTemplates,
  type RestrictedCheck,
} from './restricted-templates.js';

const row = (over: Partial<RestrictedCheck> = {}): RestrictedCheck => ({
  key: 'free_trial_invite',
  status: 'approved',
  sales_starter: true,
  header_format: null,
  ...over,
});

describe('the restricted allow-list (owner 2026-10-12)', () => {
  it('defaults to exactly free_trial_invite, welcome_greeting and trial_reschedule (owner 2026-10-18)', () => {
    expect(RESTRICTED_TEMPLATE_DEFAULTS).toEqual(['free_trial_invite', 'welcome_greeting', 'trial_reschedule']);
  });

  it('an approved, flagged text template is allowed', () => {
    expect(restrictedMay(row())).toBe(true);
    expect(restrictedMay(row({ key: 'welcome_greeting' }))).toBe(true);
  });

  it.each([
    ['not flagged', { sales_starter: false }],
    ['pending', { status: 'pending' as const }],
    ['paused', { status: 'paused' as const }],
    ['a PDF header', { header_format: 'document' as const }],
  ])('%s is refused', (_label, over) => {
    expect(restrictedMay(row(over))).toBe(false);
  });

  it.each(OWN_BUTTON_TEMPLATES)('%s (own button) is refused even when flagged', (key) => {
    expect(restrictedMay(row({ key }))).toBe(false);
  });

  it('the lesson reminders are refused unless the admin flags them', () => {
    expect(restrictedMay(row({ key: 'lesson_reminder', sales_starter: false }))).toBe(false);
  });
});

describe('sendsAllTemplates', () => {
  it('templates.manage or templates.send_all lift the list', () => {
    expect(sendsAllTemplates({ role: 'admin', permissions: ['messages.read', 'templates.manage'] })).toBe(true);
    expect(sendsAllTemplates({ role: 'admin', permissions: ['templates.send_all'] })).toBe(true);
  });

  it('anyone else (or nobody signed in) is restricted', () => {
    expect(sendsAllTemplates({ role: 'admin', permissions: ['inbox.send', 'messages.read'] })).toBe(false);
    expect(sendsAllTemplates({ role: 'teacher', permissions: [] })).toBe(false);
    expect(sendsAllTemplates({ role: null })).toBe(false);
    expect(sendsAllTemplates(undefined)).toBe(false);
  });

  it('sales, the classroom assistant and teachers are restricted whatever they were granted (owner 2026-10-15, 10-18)', () => {
    const granted = ['templates.manage', 'templates.send_all'];
    expect(sendsAllTemplates({ role: 'sales', permissions: granted })).toBe(false);
    expect(sendsAllTemplates({ role: 'assistant', permissions: granted })).toBe(false);
    expect(sendsAllTemplates({ role: 'teacher', permissions: granted })).toBe(false);
  });

  it('both keys are catalog permissions', () => {
    expect(ALL_TEMPLATES_PERMISSIONS.every(isPermission)).toBe(true);
  });
});
