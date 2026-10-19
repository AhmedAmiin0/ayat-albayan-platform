import { describe, expect, it } from 'vitest';
import { MESSAGE_SELECT, toMessageView, type ThreadMessageRow } from './message.mapper';
import { messageRow } from './sender.fakes';

// D4 (docs/21 §3): who sent an outbound bubble; D2 (§5.9): a sent file's name and no wa.me link.

const text = { template_key: null, template_params: null, body: 'السلام عليكم' } as const;
const view = (over: Partial<ThreadMessageRow>) => toMessageView({ row: { ...messageRow(text), ...over }, template: null });
const STAFF = 'a0000000-0000-4000-8000-000000000001';

describe('toMessageView sender_name / automatic (D4)', () => {
  it('the teacher\'s display name wins over the profile name', () => {
    const v = view({ created_by: STAFF, sent_by_teacher: { display_name_ar: 'أبرار' }, sender: { full_name: 'Abrar T' } });
    expect(v).toMatchObject({ sender_name: 'أبرار', sent_by_teacher_name: 'أبرار', automatic: false });
  });

  it('an admin or salesperson send shows the profile\'s full_name', () => {
    for (const full_name of ['سارة', 'المدير']) {
      const v = view({ created_by: STAFF, dedup_key: `send:${STAFF}:x`, sender: { full_name } });
      expect(v).toMatchObject({ sender_name: full_name, sent_by_teacher_name: null, automatic: false });
    }
  });

  it('a job row (created_by null, dedup_key set) is automatic with no name', () => {
    const v = view({ created_by: null, dedup_key: 'report_ready:r1', sender: null });
    expect(v).toMatchObject({ sender_name: null, automatic: true });
  });

  it('imported history (no dedup_key) is neither automatic nor named', () => {
    expect(view({ created_by: null, dedup_key: null })).toMatchObject({ sender_name: null, automatic: false });
  });

  it('an inbound row has no sender and is never automatic, even with embeds', () => {
    const v = view({ direction: 'inbound', status: 'delivered', sender: { full_name: 'x' }, sent_by_teacher: { display_name_ar: 'y' } });
    expect(v).toMatchObject({ sender_name: null, automatic: false });
  });

  it('MESSAGE_SELECT embeds the staff profile through created_by', () => {
    expect(MESSAGE_SELECT).toContain('sender:profiles!messages_created_by_fkey(full_name)');
    expect(MESSAGE_SELECT).toContain('sent_by_teacher:teachers!messages_sent_by_teacher_id_fkey(display_name_ar)');
  });
});

describe('toMessageView sent files (D2)', () => {
  it('carries media_name, and a queued or failed sent file offers no wa.me link', () => {
    for (const status of ['queued', 'failed'] as const) {
      const v = view({ status, media_path: 'out/u1/r1/f.pdf', media_mime: 'application/pdf', media_name: 'خطة.pdf' });
      expect(v).toMatchObject({ media_name: 'خطة.pdf', click_to_chat: null });
    }
  });

  it('a queued text still offers the wa.me link; a text has media_name null', () => {
    const v = view({ status: 'queued' });
    expect(v.click_to_chat).toContain('https://wa.me/');
    expect(v.media_name).toBeNull();
  });
});
