import type { TemplateView } from '@ab/shared';
import { previewParams } from '@ab/client-core';
import { TemplatePreview } from '@/inbox/composer/TemplatePreview';
import { type Draft, previewView } from './draft-input';

/** The live WhatsApp-like bubble under the form: the samples fill the variables. */
export function DraftPreview({ draft, source }: { draft: Draft; source: TemplateView | null }) {
  const params = previewParams(draft.samples);
  return <TemplatePreview template={previewView(draft, source)} params={params} />;
}
