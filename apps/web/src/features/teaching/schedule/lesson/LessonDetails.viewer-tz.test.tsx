import { setViewerPersonTz } from '@ab/client-core';
import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { ABRAR, JOUD, lesson } from './lesson-fixture';
import { LessonChip } from './LessonChip';
import { LessonDetails } from './LessonDetails';

// docs/34: every time reads in the viewer's zone; a Riyadh family's clock is added only when it
// reads differently at that instant (Cairo is UTC+2 in winter, UTC+3 in summer until 2026-10-29).

const WINTER = '2026-11-05T15:00:00.000Z'; // 18:00 in Riyadh, 17:00 in Cairo
const SUMMER = '2026-10-22T15:00:00.000Z'; // 18:00 in both
const FAMILY_18 = t.schedule.studentTime.replace(
  '{time}',
  t.schedule.inCity.replace('{time}', '18:00').replace('{city}', t.tz['Asia/Riyadh']),
);

function details(startsAt: string): string {
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  const row = lesson({ starts_at: startsAt, students: [JOUD], teacher: ABRAR });
  const { container } = render(
    <QueryClientProvider client={client}>
      <LessonDetails lesson={row} />
    </QueryClientProvider>,
  );
  return container.textContent;
}

afterEach(() => setViewerPersonTz('Asia/Riyadh'));

describe('LessonDetails in the viewer zone', () => {
  it('a Cairo viewer sees 17:00 «بتوقيتك» and the family 18:00 under it', () => {
    setViewerPersonTz('Africa/Cairo');
    const text = details(WINTER);
    expect(text).toContain(`17:00 ${t.schedule.viewerTime}`);
    expect(text).toContain(FAMILY_18);
  });

  it('a Riyadh viewer sees 18:00 and no family line', () => {
    const text = details(WINTER);
    expect(text).toContain(`18:00 ${t.schedule.viewerTime}`);
    expect(text).not.toContain(FAMILY_18);
  });

  it('Cairo summer time (2026-10-22): same clock as Riyadh, no family line', () => {
    setViewerPersonTz('Africa/Cairo');
    const text = details(SUMMER);
    expect(text).toContain(`18:00 ${t.schedule.viewerTime}`);
    expect(text).not.toContain(FAMILY_18);
  });
});

describe('LessonChip in the viewer zone', () => {
  const chip = (startsAt: string) =>
    render(<LessonChip lesson={lesson({ starts_at: startsAt, students: [JOUD] })} />).container
      .textContent;

  it('Cairo viewer in winter: 17:00 with the family 18:00', () => {
    setViewerPersonTz('Africa/Cairo');
    const text = chip(WINTER);
    expect(text).toContain('17:00');
    expect(text).toContain(FAMILY_18);
  });

  it('Cairo viewer in summer and a Riyadh viewer: no family label', () => {
    setViewerPersonTz('Africa/Cairo');
    expect(chip(SUMMER)).not.toContain(FAMILY_18);
    setViewerPersonTz('Asia/Riyadh');
    expect(chip(WINTER)).not.toContain(FAMILY_18);
  });
});
