import { describe, expect, it } from 'vitest';
import { LANE_ROWS, laneOfRow, lanesOf } from './lanes';

describe('sender lanes (docs/42 42-7)', () => {
  it('a chat-line row is the chat lane; anything else the main lane', () => {
    expect(laneOfRow({ line: 'chat' })).toBe('chat');
    expect(laneOfRow({ line: 'notifications' })).toBe('main');
    expect(laneOfRow({ line: null })).toBe('main');
  });

  it('the two lanes read complementary rows', () => {
    expect(LANE_ROWS).toEqual({ chat: 'line.eq.chat', main: 'line.is.null,line.neq.chat' });
  });

  it('a kick names one lane, or both', () => {
    expect(lanesOf('chat')).toEqual(['chat']);
    expect(lanesOf(undefined)).toEqual(['chat', 'main']);
    expect(lanesOf('other')).toEqual(['chat', 'main']);
  });
});
