import { describe, expect, it } from 'vitest';
import { CRM_SENT } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import type { TemplateNames } from '@/modules/messaging/whatsapp/templates/names/template-names';
import { scriptedFetch, templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';
import { relayDedupKey } from './relay.dedup';
import { fakeLine, fakeNames, fakeRepo, templateBody, TO } from './relay.fakes';
import type { RelayRepo } from './relay.repo';
import { relayRequestSchema } from './relay.schema';
import { RelayService } from './relay.service';

// A template the script names is stored like our own template rows (owner 2026-11-02): the chat
// draws it as a template. What goes to the CRM, the body and the dedup key stay exactly as before.

const NOW = new Date('2026-11-01T08:00:00Z');
const REMINDER = templateRow({
  key: 'teacher_lesson_reminder',
  meta_name: 'teacher_lesson_reminder',
  body_ar: 'تذكير للمعلمة {{1}}: حلقتك اليوم {{2}}',
});
const req = relayRequestSchema.parse(templateBody());

async function sent(names: TemplateNames, body = req) {
  const f = scriptedFetch(CRM_SENT);
  const repo = fakeRepo();
  const line = fakeLine({ fetch: f });
  const now = line.current();
  if (!now) throw new Error('line');
  await new RelayService(line, repo as unknown as RelayRepo, names).send(now, body, NOW);
  return { request: f.requests[0], row: repo.rows[0] };
}

const failing = { find: async () => Promise.reject(new Error('db down')) } as unknown as TemplateNames;

describe('RelayService: template rows', () => {
  it('a catalog template: its key and values («1», «2», «button») on the row, body unchanged', async () => {
    const { row } = await sent(fakeNames([REMINDER]));
    expect(row?.template).toEqual({
      key: 'teacher_lesson_reminder',
      params: { '1': 'سارة', '2': '17:00', button: 'room-1' },
    });
    expect(row?.body).toBe('[teacher_lesson_reminder]\nسارة\n17:00');
  });

  it('the CRM request, the body and the dedup key are byte-for-byte those of a raw row', async () => {
    const known = await sent(fakeNames([REMINDER]));
    const raw = await sent(fakeNames());
    expect(JSON.stringify(known.request)).toBe(JSON.stringify(raw.request));
    const kept = (r: typeof known) => ({ body: r.row?.body, dedupKey: r.row?.dedupKey });
    expect(kept(known)).toEqual(kept(raw));
    expect(kept(known).dedupKey).toBe(relayDedupKey(req, NOW));
  });

  it('the CRM gets exactly the script\'s template, name, values and button', async () => {
    const known = await sent(fakeNames([REMINDER]));
    expect(known.request?.body).toEqual({
      to: TO,
      type: 'template',
      template: {
        name: 'teacher_lesson_reminder',
        language: 'ar',
        params: { body: ['سارة', '17:00'], buttonParams: { '0': 'room-1' } },
      },
      name: 'ولي أمر',
    });
  });

  it('an unknown name, a value count that is not the template\'s, a failed read: raw row, still sent', async () => {
    const short = templateRow({ key: 'teacher_lesson_reminder', body_ar: '{{1}}' });
    for (const names of [fakeNames(), fakeNames([short]), failing]) {
      const { row, request } = await sent(names);
      expect(row?.template).toBeNull();
      expect(row?.status).toBe('sent');
      expect(request).toBeDefined();
    }
  });

  it('a text or a document names no template', async () => {
    const text = relayRequestSchema.parse({ to: TO, type: 'text', text: 'السلام عليكم' });
    expect((await sent(fakeNames([REMINDER]), text)).row?.template).toBeNull();
  });
});
