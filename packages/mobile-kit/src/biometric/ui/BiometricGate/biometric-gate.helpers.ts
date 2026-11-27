/** Nothing under the lock reaches a screen reader. */
export const hiddenWhile = (covering: boolean) =>
  ({
    accessibilityElementsHidden: covering,
    importantForAccessibility: covering ? 'no-hide-descendants' : 'auto',
  }) as const;
