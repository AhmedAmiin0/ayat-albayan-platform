import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The font-size tokens of src/index.css (--text-*) that default tailwind-merge doesn't know. Without
 * them `text-body` reads as a colour and silently drops `text-primary-foreground` (and the reverse).
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['2xs', 'body', 'h1', 'h2', 'h3', 'h4', 'display', 'hero'] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
