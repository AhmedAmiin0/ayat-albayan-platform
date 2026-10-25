import { RATING_TEMPLATE } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_TEMPLATE } from '@/features/feedback/types';
import { allowedTemplates } from './allowed-templates';
import { template } from '../../testing/inbox-fixture';

describe('the templates a thread offers', () => {
  it('approved only; never the feedback request or the lesson rating', () => {
    const list = [
      template({ key: 'a' }),
      template({ key: 'b', status: 'pending' }),
      template({ key: FEEDBACK_TEMPLATE }),
      template({ key: RATING_TEMPLATE }),
    ];
    expect(allowedTemplates(list, false).map((x) => x.key)).toEqual(['a']);
  });

  it('no list yet (or none) is an empty list', () => {
    expect(allowedTemplates(undefined, false)).toEqual([]);
    expect(allowedTemplates([], true)).toEqual([]);
  });
});
