import { describe, expect, it } from 'vitest';
import { createStub } from './stub.ts';
import { createTemplate, reviewTemplate } from './templates.ts';

const fresh = () => createStub({ templates: [] }).state;
const body = (text: string, example?: unknown) => ({
  name: 'n1',
  components: [{ type: 'BODY', text, ...(example === undefined ? {} : { example }) }],
});
const invalid = (details: string) => [
  400,
  {
    error: expect.objectContaining({
      code: 100,
      error_data: { messaging_product: 'whatsapp', details },
    }),
  },
];

describe('wa-stub: createTemplate', () => {
  it('checks the name, then a duplicate, then the components', () => {
    const s = fresh();
    expect(createTemplate(s, { body: { name: 'Bad Name' }, wabaId: 'W' })).toEqual([
      400,
      expect.anything(),
    ]);
    expect(createTemplate(s, { body: { name: 'n1' }, wabaId: 'W' })).toEqual([
      200,
      expect.anything(),
    ]);
    const dup = createTemplate(s, { body: body('{{1}} x'), wabaId: 'W' });
    expect(dup).toEqual([
      400,
      expect.objectContaining({ error: expect.objectContaining({ code: 100 }) }),
    ]);
    expect(JSON.stringify(dup)).toContain('n1');
    expect(createTemplate(s, { body: { ...body('x'), language: 'en' }, wabaId: 'W' })).toEqual([
      200,
      expect.anything(),
    ]);
  });

  it('a body variable may not open or close the body and needs one filled example per variable', () => {
    const s = fresh();
    const edge = invalid("Variables can't be at the start or end of the template.");
    expect(createTemplate(s, { body: body('{{1}} x'), wabaId: 'W' })).toEqual(edge);
    expect(createTemplate(s, { body: body('x {{1}}'), wabaId: 'W' })).toEqual(edge);
    const need = invalid('component of type BODY needs example.body_text with 2 values');
    const twice = 'a {{1}} b {{2}} c {{1}} d';
    expect(createTemplate(s, { body: body(twice), wabaId: 'W' })).toEqual(need);
    expect(createTemplate(s, { body: body(twice, { body_text: 'x' }), wabaId: 'W' })).toEqual(need);
    const blank = { body_text: [['a', ' ']] };
    expect(createTemplate(s, { body: body(twice, blank), wabaId: 'W' })).toEqual(need);
    expect(createTemplate(s, { body: body(twice, { body_text: [['a']] }), wabaId: 'W' })).toEqual(
      need,
    );
    expect(s.templates).toEqual([]);
    const ok = createTemplate(s, { body: body(twice, { body_text: [['a', 'b']] }), wabaId: 'W' });
    expect(ok).toEqual([200, expect.anything()]);
  });

  it('stores a PENDING template with defaults, its category upper-cased, on no unknown WABA', () => {
    const s = fresh();
    expect(createTemplate(s, { body: { name: 'n2', category: 'marketing' }, wabaId: 'W' })).toEqual(
      [200, { id: expect.any(String), status: 'PENDING', category: 'MARKETING' }],
    );
    createTemplate(s, { body: { name: 'n3' }, wabaId: 'W' });
    expect(s.templates).toEqual([
      {
        id: expect.any(String),
        name: 'n2',
        language: 'ar',
        category: 'MARKETING',
        status: 'PENDING',
        quality: 'UNKNOWN',
        components: [],
      },
      {
        id: expect.any(String),
        name: 'n3',
        language: 'ar',
        category: 'UTILITY',
        status: 'PENDING',
        quality: 'UNKNOWN',
        components: [],
      },
    ]);
  });

  it('a WABA a configured line owns is kept on the template', () => {
    const s = createStub({ templates: [], wabaId: 'WABA-N' }).state;
    createTemplate(s, { body: { name: 'n4' }, wabaId: 'WABA-N' });
    expect(s.templates[0]?.wabaId).toBe('WABA-N');
  });
});

describe('wa-stub: reviewTemplate', () => {
  it('404 names the template, and the WABA when one is given', () => {
    const s = fresh();
    expect(reviewTemplate(s, { name: 'x', body: {} })).toEqual([404, { error: 'no template x' }]);
    expect(reviewTemplate(s, { name: 'x', body: { waba: 'W' } })).toEqual([
      404,
      { error: 'no template x on W' },
    ]);
  });

  it('keeps status and quality unless given; sets rejected_reason only when it is a string', () => {
    const s = fresh();
    createTemplate(s, { body: { name: 'n5' }, wabaId: 'W' });
    expect(reviewTemplate(s, { name: 'n5', body: { rejected_reason: 7 } })).toEqual([
      200,
      expect.objectContaining({ status: 'PENDING', quality: 'UNKNOWN' }),
    ]);
    expect(s.templates[0]).not.toHaveProperty('rejectedReason');
    const done = { status: 'REJECTED', quality: 'RED', rejected_reason: 'TAG_CONTENT_MISMATCH' };
    reviewTemplate(s, { name: 'n5', body: done });
    expect(s.templates[0]).toMatchObject({
      status: 'REJECTED',
      quality: 'RED',
      rejectedReason: 'TAG_CONTENT_MISMATCH',
    });
  });
});
