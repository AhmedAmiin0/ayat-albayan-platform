import { describe, expect, it } from 'vitest';
import { threadModeRoutes } from '../../messaging';
import { aMessageView } from './messages';
import { aThreadDelta, aThreadDetail } from './thread-pages';

describe('chat page builders', () => {
  it('build a page and a delta that their routes accept as they are', () => {
    expect(threadModeRoutes.page.response.parse(aThreadDetail())).toEqual(aThreadDetail());
    expect(threadModeRoutes.delta.response.parse(aThreadDelta())).toEqual(aThreadDelta());
  });

  it('keep what a test overrides', () => {
    const messages = [aMessageView()];
    expect(aThreadDetail({ messages, has_more: true })).toMatchObject({ messages, has_more: true });
    expect(aThreadDelta({ pending: messages }).pending).toEqual(messages);
  });
});
