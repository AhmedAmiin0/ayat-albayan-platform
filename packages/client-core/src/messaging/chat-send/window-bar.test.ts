import type { ReopenSent, TemplateView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { reopenChoices, reopenTick, windowBar } from './window-bar.js';

describe('windowBar: the composer bar after the 24 h window (owner 2026-11-14)', () => {
  it.each([
    { open: true, sent: false, noneAllowed: false, bar: 'open' },
    { open: true, sent: true, noneAllowed: true, bar: 'open' },
    { open: false, sent: false, noneAllowed: false, bar: 'reopen' },
    { open: false, sent: true, noneAllowed: false, bar: 'sent' },
    { open: false, sent: true, noneAllowed: true, bar: 'sent' },
    { open: false, sent: false, noneAllowed: true, bar: 'none_allowed' },
  ])('open $open, sent $sent, none $noneAllowed → $bar', ({ bar, ...input }) => {
    expect(windowBar(input)).toBe(bar);
  });
});

const SENT: ReopenSent = { id: 'm1', template_key: 'welcome_greeting', status: 'queued' };

describe('reopenTick: the bubble moves the tick', () => {
  it('reads the live bubble of the same id', () => {
    const rows = [{ id: 'm0', status: 'read' as const }, { id: 'm1', status: 'delivered' as const }];
    expect(reopenTick(SENT, rows)).toBe('delivered');
  });

  it('no bubble loaded: the thread page status', () => {
    expect(reopenTick(SENT, [])).toBe('queued');
  });
});

const tpl = (key: string, line: TemplateView['line']): TemplateView =>
  ({ key, line }) as TemplateView;

describe('reopenChoices: chat-line templates, the academy one first picked', () => {
  const allowed = [tpl('notice', 'notifications'), tpl('free_trial_invite', 'chat'), tpl('welcome_greeting', 'chat')];

  it('preselects chat_reopen_template and leaves other lines out', () => {
    const out = reopenChoices(allowed, 'welcome_greeting');
    expect(out.list.map((x) => x.key)).toEqual(['free_trial_invite', 'welcome_greeting']);
    expect(out.initial?.key).toBe('welcome_greeting');
  });

  it('the setting is not allowed for this user: the first allowed one', () => {
    expect(reopenChoices(allowed, 'other').initial?.key).toBe('free_trial_invite');
    expect(reopenChoices(allowed, undefined).initial?.key).toBe('free_trial_invite');
  });

  it('nothing on the chat line: no choice', () => {
    expect(reopenChoices([tpl('notice', 'notifications')], 'notice')).toEqual({ list: [], initial: null });
  });
});
