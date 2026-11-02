import { templateCreateSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { emptyDraft, newButton, toInput, varCount, varsOf } from './template-draft';

// «قالب جديد» (owner 2026-10-31): the form's variables follow the body; what it posts.

describe('template draft', () => {
  it('varCount: the highest {{n}} in the text, never above nine', () => {
    expect(varCount('no variables')).toBe(0);
    expect(varCount('Hi {{1}}, {{2}} and {{1}} again')).toBe(2);
    expect(varCount('gap {{3}}')).toBe(3);
    expect(varCount('{{12}}')).toBe(9);
  });

  it('varsOf keeps the typed rows by position and adds blank ones', () => {
    const vars = [{ name: 'student_name', sample: 'Sara' }];
    expect(varsOf({ body: 'a {{1}} b {{2}} c', vars })).toEqual([vars[0], { name: '', sample: '' }]);
    expect(varsOf({ body: 'none', vars })).toEqual([]);
  });

  it('toInput: an unnamed variable goes as var_n; the API schema accepts the result', () => {
    const draft = {
      ...emptyDraft('chat'),
      key: 'welcome_back',
      body: 'Hi {{1}}, see you {{2}}.',
      vars: [{ name: 'student_name', sample: 'Sara' }, { name: '', sample: 'Sunday' }],
      buttons: [{ ...newButton('quick_reply'), text: 'OK' }],
    };
    const input = toInput(draft);
    expect(input.params).toEqual([{ name: 'student_name', sample: 'Sara' }, { name: 'var_2', sample: 'Sunday' }]);
    expect(templateCreateSchema.parse(input)).toMatchObject({ key: 'welcome_back', line: 'chat', header: null, footer: null });
  });

  it('newButton: a link starts as https://, a quick reply confirms', () => {
    expect(newButton('url')).toEqual({ type: 'url', text: '', url: 'https://' });
    expect(newButton('quick_reply')).toEqual({ type: 'quick_reply', text: '', intent: 'confirm' });
  });
});
