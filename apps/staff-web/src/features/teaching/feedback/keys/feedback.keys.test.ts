import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { feedbackKeys } from './feedback.keys';

const LIST = { page: 1, sort: [], filters: {} };

describe('feedback keys', () => {
  it('keeps the key shapes the feedback screens already cache under', () => {
    expect(feedbackKeys.public('tok')).toEqual(['feedback', 'public', 'tok']);
    expect(feedbackKeys.list(LIST)).toEqual(['feedback', 'list', LIST]);
    expect(feedbackKeys.summary()).toEqual(['feedback', 'summary']);
    expect(feedbackKeys.mine(LIST)).toEqual(['feedback', 'mine', LIST]);
  });

  it('keeps every feedback read under the feedback root', async () => {
    const reads = [feedbackKeys.list(LIST), feedbackKeys.summary(), feedbackKeys.mine(LIST)];
    expect(await staleAfter(reads, feedbackKeys.all)).toEqual(reads);
  });
});
