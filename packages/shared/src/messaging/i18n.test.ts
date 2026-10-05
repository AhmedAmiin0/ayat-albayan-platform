import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import { MESSAGE_STATUSES, PUSH_KINDS, TEMPLATE_STATUSES } from '../enums/index.js';
import { messageStatusStyle, templateStatusStyle } from './status-style.js';
import { TEMPLATE_KEYS } from './templates.js';

describe('Phase 4 strings and chips (rule 10, docs/07 §6)', () => {
  it('every template key has an Arabic name', () => {
    expect(Object.keys(ar.templates.names).sort()).toEqual([...TEMPLATE_KEYS].sort());
  });

  it('every push kind has a title and a body', () => {
    for (const kind of PUSH_KINDS) {
      expect(ar.notifications[kind].title).toBeTruthy();
      expect(ar.notifications[kind].body).toBeTruthy();
    }
  });

  it('the session-window notice keeps its exact wording', () => {
    expect(ar.inbox.sessionClosed).toBe('مضى أكثر من 24 ساعة على آخر رسالة منه — يجب أن ترسل قالبًا');
  });

  it.each([
    ['message', MESSAGE_STATUSES, messageStatusStyle],
    ['template', TEMPLATE_STATUSES, templateStatusStyle],
  ] as const)('%s statuses: every value has a chip style, nothing extra', (_name, values, map) => {
    expect(Object.keys(map).sort()).toEqual([...values].sort());
  });

  it('saffron (act) only where the admin must act: a failed send, a template to fix', () => {
    const act = Object.entries({ ...messageStatusStyle })
      .filter(([, s]) => s.tone === 'act')
      .map(([k]) => k);
    expect(act).toEqual(['failed']);
    expect(templateStatusStyle.approved.tone).toBe('ok');
  });
});
