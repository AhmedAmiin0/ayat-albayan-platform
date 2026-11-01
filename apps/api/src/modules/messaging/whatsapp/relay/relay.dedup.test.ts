import { describe, expect, it } from 'vitest';
import { relayDedupKey } from './relay.dedup';
import { relayRequestSchema, type RelayRequest } from './relay.schema';
import { templateBody, TO } from './relay.fakes';

// Rule 8: one key per message per 15-minute window.

const req = (body: unknown): RelayRequest => relayRequestSchema.parse(body);
const AT = new Date('2026-11-01T08:01:00Z');

describe('relayDedupKey', () => {
  it('is script-relay: + a sha256, stable inside the window', () => {
    const key = relayDedupKey(req(templateBody()), AT);
    expect(key).toMatch(/^script-relay:[0-9a-f]{64}$/);
    expect(
      relayDedupKey(req(templateBody('+966500000001')), new Date('2026-11-01T08:14:59Z')),
    ).toBe(key);
  });

  it('changes with the window, the recipient, the type content', () => {
    const key = relayDedupKey(req(templateBody()), AT);
    expect(relayDedupKey(req(templateBody()), new Date('2026-11-01T08:15:00Z'))).not.toBe(key);
    expect(relayDedupKey(req(templateBody('966500000002')), AT)).not.toBe(key);
    const other = {
      ...templateBody(),
      template: {
        name: 'teacher_lesson_reminder',
        language: 'ar',
        params: { body: ['سارة', '18:00'] },
      },
    };
    expect(relayDedupKey(req(other), AT)).not.toBe(key);
    const text = (t: string) => relayDedupKey(req({ to: TO, type: 'text', text: t }), AT);
    expect(text('a')).not.toBe(text('b'));
    const doc = (link: string) => relayDedupKey(req({ to: TO, type: 'document', link }), AT);
    expect(doc('https://drive.example/a')).not.toBe(doc('https://drive.example/b'));
  });
});
