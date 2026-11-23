import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import { ChatGlyph } from '#/components/channel/bubble/ChatGlyph.tsx';
import { t } from '#/lib/i18n/index.ts';
import { escapeCloses } from './use-composer';

const m = t.studentChannel.media;

interface Props {
  onFile: (file: File) => void;
  onClose: () => void;
}

interface SourceProps {
  accept: string;
  label: string;
  glyph: ReactNode;
  onFile: (file: File) => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

/** One source: a label over its hidden file input (the browser's own picker). */
function Source({ accept, label, glyph, onFile, onKeyDown }: SourceProps) {
  const picked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };
  return (
    <label className="ab-press grid cursor-pointer justify-items-center gap-1.5 rounded-md p-2 text-sm font-semibold text-ink hover:bg-sunk has-focus-visible:outline-2 has-focus-visible:outline-lapis">
      <span className="grid size-12 place-items-center rounded-full bg-accent text-lapis">{glyph}</span>
      {label}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={picked}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

/**
 * «أرفق صورة أو ملف PDF» (FamChatWebAttach): a photo (JPG or PNG) or a PDF from the device, with
 * the hint of what the chat takes. It pops in above the composer; Esc closes it.
 */
export function AttachMenu({ onFile, onClose }: Props) {
  const onKeyDown = escapeCloses(onClose);
  return (
    <div
      role="group"
      aria-label={m.attach}
      className="absolute bottom-full z-30 mb-2 grid w-72 max-w-[calc(100vw-2rem)] animate-pop-in gap-3 rounded-md border border-rule bg-card p-4 shadow-pop end-0"
    >
      <p className="text-sm font-bold">{m.attach}</p>
      <div className="grid grid-cols-2 gap-2">
        <Source
          accept="image/jpeg,image/png"
          label={m.photo}
          glyph={<ChatGlyph name="photo" className="size-6" />}
          onFile={onFile}
          onKeyDown={onKeyDown}
        />
        <Source
          accept="application/pdf"
          label={m.pdf}
          glyph={<ChatGlyph name="page" className="size-6" />}
          onFile={onFile}
          onKeyDown={onKeyDown}
        />
      </div>
      <p className="flex items-center gap-1.5 text-2xs text-ink-3">
        <ChatGlyph name="info" className="size-3.5" />
        {m.hint}
      </p>
    </div>
  );
}
