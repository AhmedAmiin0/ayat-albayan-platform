import { catalogueViews, NOTIFICATION_AUDIENCES, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { audienceCounts } from './overview-counts';

const views = (gateReason: 'switch_off' | null) => catalogueViews({ settings: SETTING_DEFAULTS, gateReason, templates: new Map() });

describe('«ماذا يُرسل الآن» counts', () => {
  it('one row per audience, in the audience tabs order, named as there', () => {
    const rows = audienceCounts(views('switch_off'));
    expect(rows.map((r) => r.audience)).toEqual([...NOTIFICATION_AUDIENCES]);
    expect(rows.map((r) => r.label)).toEqual(NOTIFICATION_AUDIENCES.map((a) => t.notificationCatalogue.audience[a]));
  });

  it('counts each automatic row once per audience it reaches, by its own state; manual rows are left out', () => {
    const entries = views(null);
    const rows = audienceCounts(entries);
    // A schedule change reaches the guardian and the teacher (also_to): it counts under both.
    const reached = (e: (typeof entries)[number]) => [e, ...(e.also_to ?? []).map(() => e)];
    const automatic = entries.filter((e) => !e.manual).flatMap(reached);
    expect(rows.reduce((n, r) => n + r.on + r.off, 0)).toBe(automatic.length);
    expect(rows.reduce((n, r) => n + r.on, 0)).toBe(automatic.filter((e) => e.state === 'on').length);
  });

  it('sending off: nothing that goes through WhatsApp counts as sending', () => {
    const off = views('switch_off');
    const on = off.filter((e) => !e.manual && e.state === 'on');
    expect(on.every((e) => !e.channels.includes('whatsapp'))).toBe(true);
    expect(audienceCounts([])).toEqual(NOTIFICATION_AUDIENCES.map((a) => expect.objectContaining({ audience: a, on: 0, off: 0 })));
  });
});
