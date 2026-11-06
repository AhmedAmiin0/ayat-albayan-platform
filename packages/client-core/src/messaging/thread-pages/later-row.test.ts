import { describe, expect, it } from 'vitest';
import type { MessageView } from '@ab/shared';
import { laterRow } from './later-row.js';
import { msg } from './thread.fakes.test-util.js';

const as = (status: MessageView['status']) => msg(1, { status });

describe('laterRow: two copies of one message', () => {
  it('keeps the held copy only when it is further along queued < sent < delivered < read', () => {
    expect(laterRow(as('delivered'), as('sent')).status).toBe('delivered');
    expect(laterRow(as('sent'), as('read')).status).toBe('read');
    expect(laterRow(as('sent'), as('sent')).status).toBe('sent');
  });

  it('failed and sent_manually always replace, and a held failed row moves on', () => {
    expect(laterRow(as('read'), as('failed')).status).toBe('failed');
    expect(laterRow(as('delivered'), as('sent_manually')).status).toBe('sent_manually');
    expect(laterRow(as('failed'), as('queued')).status).toBe('queued');
  });
});
