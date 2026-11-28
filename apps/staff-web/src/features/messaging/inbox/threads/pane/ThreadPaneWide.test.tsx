import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { railThread } from '@ab/web-kit';
import { ThreadPaneWide } from './ThreadPaneWide';

const pane = (aside: boolean) =>
  render(
    <ThreadPaneWide
      labelledBy="h"
      header={<h2 id="h">thread</h2>}
      log={<ol data-log />}
      reply={<textarea aria-label="reply" />}
      aside={aside}
      side={<aside data-side className={railThread} />}
      toast={null}
    />,
  ).container;

const gridOf = (root: HTMLElement) => root.querySelector('[data-log]')?.parentElement?.parentElement;

describe('ThreadPaneWide (docs/65 UX-5)', () => {
  it('measures its own width, not the window, so the list and sidebar count', () => {
    expect(pane(true).querySelector('section')?.className).toContain('@container/thread');
  });

  it('puts the panel beside the chat only when the thread is wide enough for both', () => {
    const cls = gridOf(pane(true))?.className ?? '';
    expect(cls).toContain('@3xl/thread:grid-cols-[minmax(0,1fr)_clamp(260px,32%,340px)]');
    expect(cls).not.toMatch(/(^|\s)xl:/);
  });

  it('below that width the panel folds under the chat, which keeps the full thread width', () => {
    const cls = gridOf(pane(true))?.className ?? '';
    expect(cls).not.toMatch(/(^|\s)grid-cols-/);
    expect(cls).toContain('shell:overflow-y-auto');
  });

  it('the panel scrolls inside its cell only while it sits beside the chat', () => {
    const side = pane(true).querySelector('[data-side]')?.className ?? '';
    expect(side).toContain('@3xl/thread:overflow-y-auto');
    expect(side).not.toMatch(/(^|\s)xl:/);
  });

  it('without a panel the chat fills the pane from 900px', () => {
    const cls = gridOf(pane(false))?.className ?? '';
    expect(cls).toContain('shell:grid-rows-[minmax(0,1fr)]');
    expect(cls).not.toContain('@3xl/thread:');
  });
});
