import assert from 'node:assert/strict';
import { test } from 'node:test';
import { templateParam } from './stub-template';

const sent = (components: unknown) => ({
  messaging_product: 'whatsapp',
  template: { name: 't', components },
});

test('templateParam reads the first parameter of the component of that type', () => {
  const body = sent([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: '123456' },
        { type: 'text', text: 'x' },
      ],
    },
    { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'tok' }] },
  ]);
  assert.equal(templateParam(body, 'body')?.text, '123456');
  assert.equal(templateParam(body, 'button')?.text, 'tok');
});

test('templateParam reads a header document link and file name', () => {
  const document = { link: 'https://x/r.pdf', filename: 'r.pdf' };
  const body = sent([{ type: 'header', parameters: [{ type: 'document', document }] }]);
  assert.deepEqual(templateParam(body, 'header')?.document, document);
});

test('templateParam gives undefined for a missing component or parameter list', () => {
  const body = sent([{ type: 'body' }]);
  assert.equal(templateParam(body, 'header'), undefined);
  assert.equal(templateParam(body, 'body'), undefined);
});

test('templateParam gives undefined for a body that is not a template', () => {
  assert.equal(templateParam(undefined, 'body'), undefined);
  assert.equal(templateParam({ text: { body: 'hi' } }, 'body'), undefined);
  assert.equal(templateParam({ template: {} }, 'body'), undefined);
});
