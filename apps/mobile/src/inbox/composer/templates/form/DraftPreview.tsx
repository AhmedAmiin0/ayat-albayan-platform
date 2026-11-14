import type { AuthorTemplate } from '@ab/client-core';
import { previewParams } from '@ab/client-core';
import { TemplatePreview } from '@/inbox/composer/TemplatePreview';
import { type Draft, previewView } from './draft-input';

/** The live WhatsApp-like bubble under the form: the samples fill the variables. */
export function DraftPreview({ draft, source }: { draft: Draft; source: AuthorTemplate | null }) {
  const params = previewParams(draft.samples);
  return <TemplatePreview template={previewView(draft, source)} params={params} />;
}
