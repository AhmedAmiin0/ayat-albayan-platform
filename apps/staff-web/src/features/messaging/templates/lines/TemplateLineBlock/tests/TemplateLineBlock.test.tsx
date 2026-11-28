import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { fullTime } from '@/features/messaging/inbox/format';
import { t, locale } from '@ab/web-kit';
import { lineSync, lineView } from '@/features/messaging/templates/lines/template-lines-fixture';
import {
  newerSync,
  TemplateLineBlock,
} from '@/features/messaging/templates/lines/TemplateLineBlock/TemplateLineBlock';
import { mockCall } from '@ab/testing/mock-call';

/** The web reads every time in 12 h. */
const C12 = { cycle: '12', locale } as const;

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const p = t.templates.perNumber;

afterEach(() => mockApi.reset('write'));

describe('TemplateLineBlock', () => {
  it('a number the server is not set up for says so and offers no sync', () => {
    renderWithClient(
      <TemplateLineBlock
        line="chat"
        facts={lineView('chat', { configured: false })}
        phone={undefined}
        onNotice={vi.fn()}
      />,
    );
    expect(screen.getByText(p.notConfigured)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the phone from the lines check and the server’s last sync when none ran in this session', () => {
    const last = lineSync({ checked_at: '2026-10-17T06:30:00Z', meta_count: 12, synced: 9 });
    renderWithClient(
      <TemplateLineBlock
        line="notifications"
        facts={lineView('notifications', { last_sync: last })}
        phone="+20 100 000 0000"
        onNotice={vi.fn()}
      />,
    );
    expect(screen.getByText('+20 100 000 0000').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(
      screen.getByText(p.lastSync.replace('{time}', fullTime('2026-10-17T06:30:00Z', C12))),
    ).toBeTruthy();
    expect(screen.getByText(p.metaCount).nextElementSibling?.textContent).toBe('12');
    expect(screen.getByText(p.noneImported)).toBeTruthy();
    expect(screen.getByText(t.integrations.options.meta)).toBeTruthy();
  });

  it('before the facts load: the sync is offered, the unknowns read «—»', () => {
    renderWithClient(
      <TemplateLineBlock
        line="notifications"
        facts={undefined}
        phone={undefined}
        onNotice={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', {
        name: p.syncFor.replace('{line}', t.enums.waLine.notifications),
      }),
    ).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText(p.neverSynced)).toBeTruthy();
  });

  it('newerSync keeps the later checked_at, either side may be missing', () => {
    const old = lineSync({ checked_at: '2026-10-18T08:00:00Z' });
    const fresh = lineSync({ checked_at: '2026-10-18T09:00:00Z' });
    expect(newerSync(old, fresh)).toBe(fresh);
    expect(newerSync(fresh, old)).toBe(fresh);
    expect(newerSync(null, old)).toBe(old);
    expect(newerSync(old, null)).toBe(old);
    expect(newerSync(null, null)).toBeNull();
  });

  it('the sync button’s name starts with its number and contains its visible label (WCAG 2.5.3)', () => {
    renderWithClient(
      <TemplateLineBlock
        line="chat"
        facts={lineView('chat')}
        phone={undefined}
        onNotice={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', {
      name: p.syncFor.replace('{line}', t.enums.waLine.chat),
    });
    expect(button.getAttribute('aria-label')).toContain(button.textContent);
  });
});
