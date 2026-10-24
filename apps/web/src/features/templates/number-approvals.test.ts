import type { NumberView, TemplateView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { numberView } from '@/features/numbers/numbers.fixture';
import { approvalOf, approvalRows, isPartial, shownNumbers } from './number-approvals';

const DEF = numberView({
  id: 'n-def',
  purpose: 'notifications',
  is_default: true,
  fallback_rank: 100,
});
const LOW = numberView({
  id: 'n-low',
  purpose: 'notifications',
  is_default: false,
  fallback_rank: 5,
});
const HIGH = numberView({
  id: 'n-high',
  purpose: 'notifications',
  is_default: false,
  fallback_rank: 50,
});
const CHAT = numberView({ id: 'n-chat', purpose: 'chat', is_default: true });
const ALL: NumberView[] = [HIGH, CHAT, LOW, DEF];

type Tpl = Pick<TemplateView, 'line' | 'status' | 'number_id' | 'numbers'>;
const tpl = (patch: Partial<Tpl> = {}): Tpl => ({
  line: 'notifications',
  status: 'approved',
  number_id: null,
  numbers: [],
  ...patch,
});
const row = (number_id: string, status: TemplateView['status']) => ({
  number_id,
  status,
  last_checked_at: null,
  last_error: null,
});

describe('shownNumbers', () => {
  it('lists the role in routing order: default, then fallback_rank', () => {
    expect(shownNumbers(tpl(), ALL).map((n) => n.id)).toEqual(['n-def', 'n-low', 'n-high']);
  });

  it('puts the template’s own number first, once, and adds other synced numbers', () => {
    const ids = shownNumbers(
      tpl({ number_id: 'n-high', numbers: [row('n-chat', 'pending')] }),
      ALL,
    ).map((n) => n.id);
    expect(ids).toEqual(['n-high', 'n-def', 'n-low', 'n-chat']);
  });

  it('works on an older API without numbers[]', () => {
    expect(shownNumbers({ line: 'chat', status: 'approved' }, ALL).map((n) => n.id)).toEqual([
      'n-chat',
    ]);
  });
});

describe('approvalOf', () => {
  it('a synced row wins', () => {
    expect(approvalOf(tpl({ numbers: [row('n-def', 'rejected')] }), DEF)).toBe('rejected');
    expect(approvalOf(tpl({ numbers: [row('n-low', 'pending')] }), LOW)).toBe('pending');
  });

  it('with no row the role default takes the registry status; another number is not synced', () => {
    expect(approvalOf(tpl({ status: 'pending' }), DEF)).toBe('pending');
    expect(approvalOf(tpl(), LOW)).toBe('not_synced');
    expect(approvalOf(tpl({ line: 'chat' }), DEF)).toBe('not_synced');
  });
});

describe('isPartial', () => {
  it('is true only for a mix of approved and not approved', () => {
    expect(isPartial(approvalRows(tpl(), ALL))).toBe(true);
    expect(isPartial(approvalRows(tpl(), [DEF]))).toBe(false);
    expect(isPartial(approvalRows(tpl({ status: 'pending' }), [DEF, LOW]))).toBe(false);
    expect(isPartial([])).toBe(false);
  });
});
