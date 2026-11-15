import type { LineCheckView, TemplateLineSync, TemplateLineView, WaLine } from '@ab/shared';

// Test fixtures for the per-number template section (not app code).

export function lineSync(patch: Partial<TemplateLineSync> = {}): TemplateLineSync {
  return {
    line: 'notifications',
    configured: true,
    provider: 'meta',
    waba_id: 'waba-n',
    phone_number_id: 'pn-n',
    ok: true,
    checked_at: '2026-10-18T08:00:00Z',
    meta_count: 0,
    synced: 0,
    imported: [],
    skipped: [],
    ...patch,
  };
}

export function lineView(line: WaLine, patch: Partial<TemplateLineView> = {}): TemplateLineView {
  return {
    line,
    configured: true,
    provider: line === 'chat' ? 'kapso' : 'meta',
    waba_id: line === 'chat' ? 'waba-c' : 'waba-n',
    phone_number_id: line === 'chat' ? 'pn-c' : 'pn-n',
    last_checked_at: null,
    last_sync: null,
    ...patch,
  };
}

export const LINES: TemplateLineView[] = [lineView('notifications'), lineView('chat')];

/** A lines-check answer (LinesCard) that only carries what the template section reads. */
export function checked(line: WaLine, phone: string | null): LineCheckView {
  return {
    line,
    configured: true,
    phone_number_id: null,
    waba_id: null,
    app_id: null,
    display_phone_number: phone,
    verified_name: null,
    quality_rating: null,
    status: null,
    name_status: null,
    code_verification_status: null,
    subscribed_apps: null,
    errors: [],
    checked_at: '2026-10-18T08:00:00Z',
    provider: 'meta',
    gaps: [],
    duplicate_chat_phone: false,
  };
}
