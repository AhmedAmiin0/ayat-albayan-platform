import { templateCreateSchema } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '@/common/audit/audit.service';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { submitPayload } from '@/modules/messaging/whatsapp/messages/wa-components';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { createdRow, TemplateCreator } from './template-create';

// «قالب جديد» (owner 2026-10-31): the registry row an admin's new template becomes.

const input = templateCreateSchema.parse({
  key: 'welcome_back',
  line: 'chat',
  category: 'marketing',
  header: 'Ayat Al-Bayan',
  body: 'Welcome back {{1}}, your lesson is on {{2}}.',
  footer: 'Reply STOP to stop',
  params: [
    { name: 'student_name', sample: 'Sara' },
    { name: 'var_2', sample: 'Sunday 17:00' },
  ],
  buttons: [
    { type: 'url', text: 'Join', url: 'https://meet.google.com/{{1}}' },
    { type: 'quick_reply', text: 'Stop', intent: 'stop' },
  ],
});

/** A saved row as the database returns it (an insert row's `line` type also names `calls`). */
const saved = (row: object): TemplateRow => ({ ...templateRow(), ...row });
const queries = { create: vi.fn() };
const audit = { record: vi.fn() };
const creator = () =>
  new TemplateCreator(queries as unknown as TemplatesRepo, audit as unknown as AuditService);
/** [status, body] of the HttpException a call rejects with (anything else is rethrown). */
const rejected = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => {
      if (!(e instanceof HttpException)) throw e;
      return [e.getStatus(), e.getResponse()];
    },
  );

beforeEach(() => {
  vi.resetAllMocks();
  queries.create.mockImplementation(async (row: object) => saved(row));
});

describe('createdRow', () => {
  it('key = Meta name, its line, not submitted, off the allow-list; names and samples by position', () => {
    expect(createdRow(input)).toMatchObject({
      key: 'welcome_back',
      meta_name: 'welcome_back',
      line: 'chat',
      category: 'marketing',
      language: 'ar',
      status: 'not_submitted',
      sales_starter: false,
      params: ['student_name', 'var_2'],
      samples: ['Sara', 'Sunday 17:00'],
      footer_ar: 'Reply STOP to stop',
    });
  });

  it('a header lives in display (with the buttons as drawn); none = no display', () => {
    expect(createdRow(input).display).toEqual({
      header: { type: 'text', text: 'Ayat Al-Bayan' },
      buttons: [{ type: 'url', text: 'Join', url: 'https://meet.google.com/{{1}}' }, { type: 'quick_reply', text: 'Stop' }],
    });
    expect(createdRow({ ...input, header: null }).display).toBeNull();
  });

  it('what the existing submit then sends: TEXT header, BODY with the typed samples, FOOTER, BUTTONS', () => {
    const payload = submitPayload(saved(createdRow(input)));
    expect(payload).toMatchObject({ name: 'welcome_back', category: 'MARKETING', language: 'ar' });
    expect(payload).toMatchObject({
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Ayat Al-Bayan' },
        { type: 'BODY', example: { body_text: [['Sara', 'Sunday 17:00']] } },
        { type: 'FOOTER' },
        { type: 'BUTTONS', buttons: [{ type: 'URL', example: ['https://meet.google.com/sample'] }, { type: 'QUICK_REPLY', text: 'Stop' }] },
      ],
    });
  });
});

describe('TemplateCreator.create', () => {
  it('saves the row and audits template_created with the actor', async () => {
    const view = await creator().create(input, 'admin-1');
    expect(view).toMatchObject({ key: 'welcome_back', line: 'chat', status: 'not_submitted' });
    expect(queries.create).toHaveBeenCalledWith(expect.objectContaining({ key: 'welcome_back' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-1',
      action: 'template_created',
      after: expect.objectContaining({ key: 'welcome_back', line: 'chat' }),
    }));
  });

  it('409 invalid_template before any write: a body Meta would refuse, or variables without samples', async () => {
    const edge = { ...input, body: '{{1}} at the start {{2}}' };
    expect(await rejected(creator().create(edge, 'a'))).toEqual([409, expect.objectContaining({ code: 'invalid_template' })]);
    const short = { ...input, params: input.params.slice(0, 1) };
    expect(await rejected(creator().create(short, 'a'))).toEqual([409, expect.objectContaining({ code: 'invalid_template' })]);
    expect(queries.create).not.toHaveBeenCalled();
  });

  it('409 template_exists when the key, or the name + language, is taken; nothing audited', async () => {
    queries.create.mockResolvedValueOnce(null);
    expect(await rejected(creator().create(input, 'a'))).toEqual([409, expect.objectContaining({ code: 'template_exists' })]);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
