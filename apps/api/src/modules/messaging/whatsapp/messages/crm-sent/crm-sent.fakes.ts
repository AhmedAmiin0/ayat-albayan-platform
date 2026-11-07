import type { Json } from '@ab/db';
import { vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { TemplateNames } from '@/modules/messaging/whatsapp/templates/names/template-names';
import type { Component } from '@/modules/messaging/whatsapp/templates/sync/template-sync';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { CrmCopiesRepo } from './crm-copies.repo';
import { CrmSentText } from './crm-sent';

// Tests only: the teacher reminder of the owner's report (2026-11-07), in made-up values.

export const CRM_REMINDER_BODY =
  'تذكير من أكاديمية آيات البيان 🌿 أستاذ {{1}}، عندك حلقة {{2}} من فضلك ادخل قبل الموعد بخمس دقايق.';
export const FOOTER = 'أكاديمية آيات البيان';
export const LINE =
  'الأحد 8 نوفمبر 5:00 م · طالب (AB-0101) · رابط الحلقة: https://meet.example/x · تقرير الحلقة: https://r.example/t';

/** The registry row: its own body, a «ادخل الحلقة» URL button (not what the CRM sends). */
export const REMINDER_MEET = templateRow({
  key: 'teacher_lesson_reminder_meet',
  meta_name: 'teacher_lesson_reminder_meet',
  body_ar: 'حلقتك مع {{1}} الساعة {{2}}',
  params: ['student_names', 'lesson_time'],
  buttons: [{ type: 'url', url: 'https://meet.jit.si/{{1}}', text: 'ادخل الحلقة' }],
});

export const reminderRow = (over: Parameters<typeof messageRow>[0] = {}) =>
  messageRow({
    template_key: 'teacher_lesson_reminder_meet',
    template_params: { 1: 'طالب', 2: '5:00 م', button: 'ab-x1', crm: { body: ['محمد', LINE], buttons: [] } } as Json,
    ...over,
  });

/** The CRM's copies by «name:language». */
type Copies = Record<string, Component[]>;
export const REMINDER_COPY: Copies = {
  'teacher_lesson_reminder:ar': [{ type: 'BODY', text: CRM_REMINDER_BODY }, { type: 'FOOTER', text: FOOTER }],
};

/** MessageViews over the registry rows and the CRM copies (null = no CrmSentText). */
export function sentViews(rows: TemplateRow[], copies: Copies | null) {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const cached = async (k: string) => byKey.get(k) ?? null;
  const repo = { cached, all: async () => rows } as unknown as TemplatesRepo;
  const storage = { signedUrl: vi.fn(async () => 'https://storage.local/r.pdf') } as unknown as StorageService;
  const find = vi.fn(async (name: string, language: string) =>
    copies?.[`${name}:${language}`] ?? null);
  const crm = copies ? new CrmSentText({ find } as unknown as CrmCopiesRepo) : undefined;
  return { find, views: new MessageViews(repo, storage, new TemplateNames(repo), crm) };
}
