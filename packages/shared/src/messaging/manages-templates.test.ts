import { describe, expect, it } from 'vitest';
import { managesTemplates } from './restricted-templates.js';

// Owner 2026-10-18: the registry's admin routes are refused to an allow-list-only role, whatever it holds.

describe('managesTemplates', () => {
  it('templates.manage on a role that is not allow-list-only', () => {
    expect(managesTemplates({ role: 'admin', permissions: ['templates.manage'] })).toBe(true);
    expect(managesTemplates({ role: 'admin', permissions: ['templates.send_all'] })).toBe(false);
  });

  it.each(['sales', 'assistant', 'teacher'])('a %s-based role never manages, even holding templates.manage', (role) => {
    expect(managesTemplates({ role, permissions: ['templates.manage', 'templates.send_all'] })).toBe(false);
  });

  it('nobody signed in, or no role and no permissions', () => {
    expect(managesTemplates(undefined)).toBe(false);
    expect(managesTemplates({ role: null })).toBe(false);
  });
});
