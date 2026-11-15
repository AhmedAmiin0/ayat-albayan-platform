import { describe, expect, it } from 'vitest';
import type { RuleDraft } from './rule-draft';
import { placeRuleDraft } from './rule-drafts';

const draft: RuleDraft = { channels: ['whatsapp'], timing: null, number_id: 'num-2' };

describe('placeRuleDraft (the «الإشعارات» draft map)', () => {
  it('sets a row and keeps the others', () => {
    const one = placeRuleDraft({}, 'lesson_reminder', draft);
    expect(placeRuleDraft(one, 'new_lead', draft)).toEqual({ lesson_reminder: draft, new_lead: draft });
  });

  it('null drops the row; dropping a missing row returns the same map', () => {
    const one = placeRuleDraft({}, 'lesson_reminder', draft);
    expect(placeRuleDraft(one, 'lesson_reminder', null)).toEqual({});
    expect(placeRuleDraft(one, 'new_lead', null)).toBe(one);
  });
});
