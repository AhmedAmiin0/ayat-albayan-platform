import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { ADMIN, LESSON_ID, OPEN, queries, STUDENT_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { hashLinkToken } from './join-link.token';
import { JoinLinkService } from './join-link.service';

let q: ReturnType<typeof queries>;
let outbox: { send: ReturnType<typeof vi.fn> };
let templates: { approved: ReturnType<typeof vi.fn> };
const send = () =>
  new JoinLinkService(q as unknown as ClassroomRepo, templates as unknown as TemplateRegistry, outbox as unknown as Outbox).send(
    { lessonId: LESSON_ID, body: { studentId: STUDENT_ID }, actorId: ADMIN.id },
    OPEN,
  );
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;

beforeEach(() => {
  q = queries();
  outbox = { send: vi.fn().mockResolvedValue({ view: { status: 'queued' }, replayed: false }) };
  templates = { approved: vi.fn().mockResolvedValue({ key: 'lesson_join_link' }) };
});

describe('«أرسل رابط الحلقة»', () => {
  it('queues the lesson_join_link template to the guardian through the Outbox, token in the button', async () => {
    const r = await send();
    expect(r).toEqual({ expires_at: '2026-10-05T19:00:00.000Z', replayed: false, message_status: 'queued' });
    const row = outbox.send.mock.calls[0]?.[0];
    expect(row).toMatchObject({
      phone_e164: '+966501234567',
      template_key: 'lesson_join_link',
      lesson_id: LESSON_ID,
      created_by: ADMIN.id,
      expires_at: '2026-10-05T19:00:00.000Z',
      template_params: { '1': 'سهيلة' },
    });
    expect(row.template_params.button).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it('stores only the hash of the token it sent, expiring with the classroom', async () => {
    await send();
    const sent = outbox.send.mock.calls[0]?.[0].template_params.button as string;
    expect(q.insertLink).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      token_hash: hashLinkToken(sent),
      expires_at: '2026-10-05T19:00:00.000Z',
      created_by: ADMIN.id,
    });
    expect(JSON.stringify(q.insertLink.mock.calls)).not.toContain(sent);
  });

  it('a double press in the same five minutes shares the dedup key (the second is a replay)', async () => {
    await send();
    await send();
    const keys = outbox.send.mock.calls.map((c) => c[0].dedup_key);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toContain(`lesson_join_link:${LESSON_ID}:${STUDENT_ID}:`);
  });

  it('409 template_not_approved until Meta approved it: nothing is created or queued', async () => {
    templates.approved.mockResolvedValue(null);
    const err = await fail(send());
    expect(err.getStatus()).toBe(409);
    expect(err.getResponse()).toMatchObject({ code: 'template_not_approved' });
    expect(q.insertLink).not.toHaveBeenCalled();
    expect(outbox.send).not.toHaveBeenCalled();
  });

  it('404 for an unknown lesson, and for a student who is not on it', async () => {
    q.lesson.mockResolvedValue(null);
    expect((await fail(send())).getResponse()).toMatchObject({ code: 'lesson_not_found' });
    q.lesson.mockResolvedValue({ id: LESSON_ID, teacher_id: 't', starts_at: '2026-10-05T16:00:00.000Z', ends_at: '2026-10-05T17:00:00.000Z' });
    q.sendContext.mockResolvedValue(null);
    expect((await fail(send())).getResponse()).toMatchObject({ code: 'student_not_in_lesson' });
  });
});
