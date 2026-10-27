// Tests only: which side quoted text takes (ContentText's textAlign) in the quote block and the reply strip.
import { screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { ChatActionsContext } from '../../thread/hooks/chat-actions';
import { message } from '../../shared/thread-fixtures';
import { quoteOf } from '../hooks/quote-text';
import { QuoteBlock } from './QuoteBlock';
import { QuoteStrip } from './QuoteStrip';

const alignOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).textAlign;

/** The quoted body as the block over a bubble and as the strip over the composer, each one's textAlign. */
export async function quoteSides(body: string): Promise<{ block: unknown; strip: unknown }> {
  const m = message({ id: 'q1', direction: 'inbound', body });
  await renderWithQuery(<QuoteBlock quote={quoteOf(m)} />);
  const block = alignOf(body);
  function Strip() {
    const actions = useContext(ChatActionsContext);
    return (
      <ChatActionsContext.Provider value={{ ...actions, reply: m, threadName: 'Huda' }}>
        <QuoteStrip />
      </ChatActionsContext.Provider>
    );
  }
  await renderWithQuery(<Strip />);
  return { block, strip: alignOf(body) };
}
