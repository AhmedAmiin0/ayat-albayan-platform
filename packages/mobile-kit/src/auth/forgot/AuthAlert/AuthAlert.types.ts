export interface AuthAlertProps {
  text: string;
  /** bad: a refusal (struck glyph); ok: done or sent (filled glyph). Shape says it, colour confirms. */
  tone?: 'bad' | 'ok';
}
