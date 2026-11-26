import { describe, expect, it } from 'vitest';
import { createStub } from './stub.ts';
import { createTemplate, reviewTemplate } from './templates.ts';

const OBJ = { nested: true };
const fresh = () => createStub({ templates: [] }).state;

describe('wa-stub: template fields that are not text', () => {
  it('names an object template name as empty, not as an object', () => {
    const answer = createTemplate(fresh(), { body: { name: OBJ }, wabaId: 'W' });
    expect(JSON.stringify(answer)).toContain('invalid template name "');
    expect(JSON.stringify(answer)).not.toContain('object');
  });

  it('falls back to ar and UTILITY for an object language and category', () => {
    const s = fresh();
    const body = { name: 'n1', language: OBJ, category: OBJ };
    expect(createTemplate(s, { body, wabaId: 'W' })).toEqual([
      200,
      expect.objectContaining({ category: 'UTILITY' }),
    ]);
    expect(s.templates[0]).toMatchObject({ language: 'ar', category: 'UTILITY' });
  });

  it('refuses a quick reply whose text is an object, naming it empty', () => {
    const button = { type: 'QUICK_REPLY', text: OBJ };
    const body = { name: 'n1', components: [{ type: 'BUTTONS', buttons: [button] }] };
    const answer = createTemplate(fresh(), { body, wabaId: 'W' });
    expect(answer).toEqual([400, expect.anything()]);
    expect(JSON.stringify(answer)).toContain('button text \\"\\" must be 1-25 characters');
  });

  it('keeps the status and quality when the review sends objects', () => {
    const s = fresh();
    createTemplate(s, { body: { name: 'n1' }, wabaId: 'W' });
    const review = { status: OBJ, quality: OBJ };
    expect(reviewTemplate(s, { name: 'n1', body: review })).toEqual([
      200,
      expect.objectContaining({ status: 'PENDING', quality: 'UNKNOWN' }),
    ]);
  });
});
