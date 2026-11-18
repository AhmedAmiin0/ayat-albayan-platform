/**
 * After a refused submit: scroll to the first field marked aria-invalid inside `root` and focus
 * it, so the form opens on what is wrong instead of a message further down the panel.
 */
export function focusFirstInvalid(root: HTMLElement | null): void {
  const bad = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
  bad?.scrollIntoView({ block: 'center' });
  bad?.focus({ preventScroll: true });
}
