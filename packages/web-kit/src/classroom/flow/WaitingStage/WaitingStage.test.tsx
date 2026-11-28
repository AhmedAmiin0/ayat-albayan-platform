import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { tile } from '@ab/web-kit/testing';
import { WaitingStage } from './WaitingStage';

const W = t.roomFlow.waiting;
const attach = () => vi.fn(() => () => undefined);

describe('WaitingStage', () => {
  it('says the lesson has not started, with the page countdown', () => {
    render(<WaitingStage me={undefined} attach={attach()} note={<span>in 5 minutes</span>} />);
    expect(screen.getByRole('region', { name: W.title })).toBeTruthy();
    expect(screen.getByText(W.body)).toBeTruthy();
    expect(screen.getByText('in 5 minutes')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it("shows one's own camera tile once it is there", () => {
    const me = tile({ key: 'me', name: 'Yusuf', isLocal: true });
    render(<WaitingStage me={me} attach={attach()} />);
    expect(screen.getByRole('list')).toBeTruthy();
  });
});
