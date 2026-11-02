import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { TemplateNames } from '@/modules/messaging/whatsapp/templates/names/template-names';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { MessageViews } from './message.views';

// Owner 2026-11-02: what the old script sent through the relay shows like our own template rows:
// «قالب: …», the filled Arabic body and the buttons; a body that does not fit stays as it is.

const V2 = templateRow({
  key: 'teacher_lesson_v2',
  meta_name: 'teacher_lesson_v2',
  body_ar: 'السلام عليكم أ. {{1}}\nلديك حلقة مع {{2}}\nالموعد: {{3}}\nالمدة: {{4}}',
  buttons: [],
  footer_ar: null,
});
const MEET = templateRow({
  key: 'lesson_reminder_meet',
  meta_name: 'lesson_reminder_meet',
  body_ar: 'تذكير: حلقة {{1}} اليوم {{2}}',
  buttons: [{ type: 'url', url: 'https://meet.google.com/{{1}}', text: 'ادخل الحلقة' }],
});
const CATALOG = { teacher_lesson_v2: V2, lesson_reminder_meet: MEET };

function views() {
  const all = vi.fn(async () => Object.values(CATALOG));
  const cached = vi.fn(async (key: string) => (CATALOG as Record<string, typeof V2>)[key] ?? null);
  const storage = {} as StorageService;
  const repo = { all, cached } as unknown as TemplatesRepo;
  return new MessageViews(repo, storage, new TemplateNames(repo));
}

const relayRow = (body: string, over: Parameters<typeof messageRow>[0] = {}) =>
  messageRow({ status: 'sent', template_key: null, template_params: null, body, dedup_key: 'script-relay:1', ...over });

describe('MessageViews: relayed templates', () => {
  it('an old teacher_lesson_v2 row renders the full Arabic text as a template', async () => {
    const body = '[teacher_lesson_v2]\nسلمى\nهدى علي (AB-0001)\nالاثنين 2/11 — 4:00 م\n45 دقيقة';
    const view = await views().view(relayRow(body));
    expect(view.template_key).toBe('teacher_lesson_v2');
    expect(view.body).toBe(
      'السلام عليكم أ. سلمى\nلديك حلقة مع هدى علي (AB-0001)\nالموعد: الاثنين 2/11 — 4:00 م\nالمدة: 45 دقيقة',
    );
    expect(view.template).toEqual({ header: null, footer: null, buttons: [] });
    expect(view.automatic).toBe(true);
  });

  it('a relayed lesson_reminder_meet: filled body and its button as a label', async () => {
    const view = await views().view(relayRow('[lesson_reminder_meet]\nيوسف\n5:00 م'));
    expect(view.body).toBe('تذكير: حلقة يوسف اليوم 5:00 م');
    expect(view.template?.buttons).toEqual([{ type: 'url', text: 'ادخل الحلقة' }]);
    expect(view.forwardable).toBe(false);
  });

  it('a newer row with its stored key and button value opens the link', async () => {
    const params = { '1': 'يوسف', '2': '5:00 م', button: 'abc-defg-hij' };
    const row = relayRow('[lesson_reminder_meet]\nيوسف\n5:00 م', { template_key: 'lesson_reminder_meet', template_params: params });
    const view = await views().view(row);
    expect(view.body).toBe('تذكير: حلقة يوسف اليوم 5:00 م');
    expect(view.template?.buttons[0]).toMatchObject({ url: 'https://meet.google.com/abc-defg-hij' });
  });

  it('a malformed body, a count mismatch or an unknown name stays raw', async () => {
    for (const body of ['teacher_lesson_v2\nسلمى', '[teacher_lesson_v2]\nسلمى', '[unknown_name]\nأ']) {
      const view = await views().view(relayRow(body));
      expect(view.template_key).toBeNull();
      expect(view.body).toBe(body);
      expect(view.template).toBeNull();
    }
  });

  it('a catalog read failure leaves the row raw, never fails the thread', async () => {
    const repo = { all: async () => Promise.reject(new Error('down')), cached: async () => null } as unknown as TemplatesRepo;
    const v = new MessageViews(repo, {} as StorageService, new TemplateNames(repo));
    const body = '[lesson_reminder_meet]\nيوسف\n5:00 م';
    expect((await v.view(relayRow(body))).body).toBe(body);
  });
});
