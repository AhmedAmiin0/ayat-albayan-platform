import { afterEach, describe, expect, it } from 'vitest';
import { AUTH, closeAll, post, startStub, templateBody, uploadPdf } from './test-server.ts';

afterEach(closeAll);

type TemplateList = { data: { name: string; status: string; id: string; quality_score: { score: string } }[] };
const TPL = '/v21.0/WABA/message_templates';
const BODY = { type: 'BODY', text: 'ده تقرير {{1}} يوم {{2}}، ربنا يبارك فيه', example: { body_text: [['أحمد', 'الأحد']] } };
const code = async (res: Response) => [res.status, ((await res.json()) as { error: { code: number } }).error.code];

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
    const h = await uploadPdf(url, new Uint8Array(Buffer.from('%PDF-1.4\n%%EOF\n')));
    const created = await post(`${url}${TPL}`, {
      name: 'report_ready',
      language: 'ar',
      category: 'UTILITY',
      components: [{ type: 'HEADER', format: 'DOCUMENT', example: { header_handle: [h] } }, BODY],
    });
    expect(await created.json()).toMatchObject({ status: 'PENDING', category: 'UTILITY' });
    expect((await post(`${url}/v21.0/PHONE/messages`, templateBody('report_ready', 2))).status).toBe(404);
    await post(`${url}/__stub/templates/report_ready`, { status: 'APPROVED', quality: 'GREEN' });
    expect((await post(`${url}/v21.0/PHONE/messages`, templateBody('report_ready', 2))).status).toBe(200);
  });

  it('a DOCUMENT header needs example.header_handle from an upload; code 100 otherwise', async () => {
    const { url, stub } = await startStub();
    const create = (header: object) =>
      post(`${url}${TPL}`, { name: 'report_ready', language: 'ar', components: [{ type: 'HEADER', format: 'DOCUMENT', ...header }, BODY] });
    expect(await code(await create({}))).toEqual([400, 100]);
    expect(await code(await create({ example: { header_handle: ['4::made-up'] } }))).toEqual([400, 100]);
    expect(stub.state.templates.some((t) => t.name === 'report_ready')).toBe(false);
    const h = await uploadPdf(url, new Uint8Array(Buffer.from('%PDF-1.4\n%%EOF\n')));
    expect((await create({ example: { header_handle: [h] } })).status).toBe(200);
  });

  it('a body variable needs an example and may not open or close the body (create and edit)', async () => {
    const { url, stub } = await startStub();
    const create = (body: object) => post(`${url}${TPL}`, { name: 'renewal_due', language: 'ar', components: [body] });
    expect(await code(await create({ ...BODY, example: undefined }))).toEqual([400, 100]);
    expect(await code(await create({ ...BODY, example: { body_text: [['أحمد']] } }))).toEqual([400, 100]);
    expect(await code(await create({ type: 'BODY', text: '{{1}} باقتك خلصت', example: { body_text: [['أحمد']] } }))).toEqual([400, 100]);
    expect(await code(await create({ type: 'BODY', text: 'باقة {{1}}', example: { body_text: [['أحمد']] } }))).toEqual([400, 100]);
    expect((await create({ type: 'BODY', text: 'نص ثابت من غير متغيرات' })).status).toBe(200);
    const id = stub.state.templates.find((t) => t.name === 'renewal_due')?.id ?? '';
    expect(await code(await post(`${url}/v21.0/${id}`, { components: [{ type: 'BODY', text: 'باقة {{1}}' }] }))).toEqual([400, 100]);
  });

  it('lesson_rating: three QUICK_REPLY buttons are accepted; a text over 25 characters is code 100', async () => {
    const { url } = await startStub();
    const body = { type: 'BODY', text: 'كيف كانت حلقة {{1}} بتاريخ {{2}}؟ اختر تقييمك:', example: { body_text: [['أحمد', 'الأحد 4 أكتوبر']] } };
    const buttons = (texts: string[]) => ({ type: 'BUTTONS', buttons: texts.map((text) => ({ type: 'QUICK_REPLY', text })) });
    const create = (texts: string[]) => post(`${url}${TPL}`, { name: 'lesson_rating', language: 'ar', components: [body, buttons(texts)] });
    expect(await code(await create(['ممتازة', 'جيدة', 'x'.repeat(26)]))).toEqual([400, 100]);
    expect((await create(['ممتازة', 'جيدة', 'تحتاج تحسينًا'])).status).toBe(200);
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
    const components = [BODY];
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
