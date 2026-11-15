import type { MessageTemplateBlock } from '@ab/shared';
import type { ReactNode } from 'react';
import { TemplateFooter } from './TemplateFooter';
import { TemplateHeader } from './TemplateHeader';

/** A template's header over its content (the file, the body) and its grey footer under it; anything else as it is. */
export function TemplateFrame({ block, hasMedia, children }: { block?: MessageTemplateBlock | null; hasMedia: boolean; children: ReactNode }) {
  if (!block) return <>{children}</>;
  return (
    <>
      <TemplateHeader header={block.header} hasMedia={hasMedia} />
      {children}
      <TemplateFooter text={block.footer} />
    </>
  );
}
