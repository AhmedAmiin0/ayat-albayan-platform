import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, closeAll, post, startStub, templateBody } from './test-server.ts';

afterEach(closeAll);

type TemplateList = { data: { name: string; status: string; id: string; quality_score: { score: string } }[] };
const TPL = '/v21.0/WABA/message_templates';

describe('wa-stub: templates (R-MSG-01 health + explicit submit)', () => {
  it('lists the 8 approved templates with id, status, category and quality', async () => {
    const { url } = await startStub();
    const list = (await (await fetch(`${url}${TPL}`, { headers: AUTH })).json()) as TemplateList;
    expect(list.data.map((t) => t.name).sort()).toEqual([
      'booking_confirmation',
      'booking_confirmation_meet',
      'booking_confirmation_plain',
      'lesson_reminder_meet',
      'lesson_reminder_plain',
      'lesson_reminder_v2',
      'teacher_lesson_reminder',
      'teacher_lesson_reminder_meet',
    ]);
    expect(list.data.every((t) => t.status === 'APPROVED' && t.id && t.quality_score.score === 'GREEN')).toBe(true);
  });

  it('filters by name, as Graph does', async () => {
    const { url } = await startStub();
    const list = (await (await fetch(`${url}${TPL}?name=lesson_reminder_v2`, { headers: AUTH })).json()) as TemplateList;
    expect(list.data.map((t) => t.name)).toEqual(['lesson_reminder_v2']);
  });

  it('a submitted template is PENDING (not sendable) until the stub approves it', async () => {
    const { url } = await startStub();
    const created = await post(`${url}${TPL}`, {
      name: 'report_ready',
      language: 'ar',
      category: 'UTILITY',
      components: [{ type: 'HEADER', format: 'DOCUMENT' }, { type: 'BODY', text: 'تقرير {{1}} يوم {{2}}' }],
    });
    expect(await created.json()).toMatchObject({ status: 'PENDING', category: 'UTILITY' });
    expect((await post(`${url}/v21.0/PHONE/messages`, templateBody('report_ready', 2))).status).toBe(404);
    await post(`${url}/__stub/templates/report_ready`, { status: 'APPROVED', quality: 'GREEN' });
    expect((await post(`${url}/v21.0/PHONE/messages`, templateBody('report_ready', 2))).status).toBe(200);
  });

  it('rejects a duplicate name and a bad name', async () => {
    const { url } = await startStub();
    const dup = await post(`${url}${TPL}`, { name: 'booking_confirmation', language: 'ar', components: [] });
    expect(dup.status).toBe(400);
    expect((await post(`${url}${TPL}`, { name: 'Bad Name', language: 'ar' })).status).toBe(400);
  });

  it('editing a rejected template (POST /{id}) sends it back to review; an unknown id is code 100', async () => {
    const { url, stub } = await startStub();
    await post(`${url}/__stub/templates/booking_confirmation`, { status: 'REJECTED' });
    const id = stub.state.templates.find((t) => t.name === 'booking_confirmation')?.id ?? '';
    const components = [{ type: 'BODY', text: 'تم حجز حلقة {{1}} — {{2}}' }];
    const res = await post(`${url}/v21.0/${id}`, { category: 'utility', components });
    expect(await res.json()).toEqual({ success: true });
    expect(stub.state.templates.find((t) => t.id === id)).toMatchObject({ status: 'PENDING', category: 'UTILITY', components });
    const missing = await post(`${url}/v21.0/nope`, { components });
    expect([missing.status, ((await missing.json()) as { error: { code: number } }).error.code]).toEqual([400, 100]);
  });

  it('a paused template answers 132015', async () => {
    const { url } = await startStub();
    await post(`${url}/__stub/templates/lesson_reminder_v2`, { status: 'PAUSED' });
    const res = await post(`${url}/v21.0/PHONE/messages`, templateBody('lesson_reminder_v2', 2));
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(132015);
  });
});
