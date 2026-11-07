import type { MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { withCorrection } from './correction-view';

const view = { id: 'm2', body: 'تصحيح: نص' } as MessageView;

describe('withCorrection', () => {
  it('carries the link and the staff author of an outbound row', () => {
    const out = withCorrection(view, { corrects_id: 'm1', created_by: 'u1', direction: 'outbound' });
    expect(out).toMatchObject({ id: 'm2', corrects_id: 'm1', sent_by_id: 'u1' });
  });

  it('names no author on an inbound row, and no link when there is none', () => {
    const out = withCorrection(view, { corrects_id: null, created_by: 'u1', direction: 'inbound' });
    expect(out).toMatchObject({ corrects_id: null, sent_by_id: null });
  });
});
