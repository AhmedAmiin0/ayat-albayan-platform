import { ACCOUNT_CODE_TEMPLATE, type RestrictedCheck } from '@ab/shared';
import type { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BLOCKED_TEMPLATES, blockedTemplate, templateRefusal } from './template-guards';

const body = (e: HttpException | null) =>
  e ? { status: e.getStatus(), body: e.getResponse() } : null;
const view = (over: Partial<RestrictedCheck>): RestrictedCheck => ({
  key: 'welcome', status: 'approved', sales_starter: true, header_format: null, ...over,
});

describe('blockedTemplate: keys another flow sends', () => {
  it.each([
    ['lesson_feedback_request', 'use_feedback_request', 400],
    ['lesson_join_link', 'use_join_link', 400],
    ['lesson_rating', 'use_rating_button', 400],
    [ACCOUNT_CODE_TEMPLATE, 'template_not_allowed', 403],
  ])('%s → %s (%i)', (key, code, status) => {
    expect(body(blockedTemplate(key))).toEqual({ status, body: { code, message: code } });
  });

  it('lists exactly those four keys', () => {
    expect(Object.keys(BLOCKED_TEMPLATES)).toHaveLength(4);
  });

  it('an own key, or an inherited property name, is not blocked', () => {
    expect(blockedTemplate('welcome')).toBeNull();
    expect(blockedTemplate('toString')).toBeNull();
    expect(blockedTemplate('constructor')).toBeNull();
  });
});

describe('templateRefusal: an approved template, checked in order', () => {
  it('a restricted role may send only the allow-list (403 template_not_allowed)', () => {
    const t = view({ sales_starter: false });
    expect(body(templateRefusal(t, { restricted: true }))).toEqual({
      status: 403, body: { code: 'template_not_allowed', message: 'template_not_allowed' },
    });
    expect(templateRefusal(t, { restricted: false })).toBeNull();
  });

  it('a PDF template comes only from the PDF job (400 needs_document)', () => {
    const t = view({ header_format: 'document' });
    expect(body(templateRefusal(t, { restricted: false }))).toEqual({
      status: 400, body: { code: 'needs_document', message: 'needs_document' },
    });
  });

  it('a restricted role asking for a document template gets the allow-list answer first', () => {
    const t = view({ header_format: 'document' });
    expect(templateRefusal(t, { restricted: true })?.getStatus()).toBe(403);
  });

  it('an allowed template passes', () => {
    expect(templateRefusal(view({}), { restricted: true })).toBeNull();
  });
});
