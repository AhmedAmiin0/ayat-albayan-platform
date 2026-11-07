import { describe, expect, it } from 'vitest';
import { renderSent } from './crm-sent-render';

// A family's signed token (the feedback form, the classroom guest link) is never a staff link:
// the same rule as the registry's block (TOKEN_URL_KEYS in @ab/shared).

const copy = [
  { type: 'BODY', text: 'حلقة {{1}}' },
  { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'افتح', url: 'https://x.example/{{1}}' }] },
];
const sent = {
  name: 'x', language: 'ar', body: ['سارة'], header: null,
  buttons: [{ index: 0, kind: 'url' as const, value: 'tok-family' }],
};
const render = (key: string) => renderSent({ copy, sent, key });

describe('renderSent: token links', () => {
  it.each(['lesson_feedback_request', 'lesson_join_link'])('%s: the button has no url', (key) => {
    const out = render(key);
    expect(out.block.buttons).toEqual([{ type: 'url', text: 'افتح' }]);
    expect(out.text).toBe('حلقة سارة');
  });

  it('lesson_reminder_meet keeps its filled meeting link', () => {
    const out = render('lesson_reminder_meet');
    expect(out.block.buttons).toEqual([{ type: 'url', text: 'افتح', url: 'https://x.example/tok-family' }]);
    expect(out.text).toBe('حلقة سارة\n\nhttps://x.example/tok-family');
  });
});
