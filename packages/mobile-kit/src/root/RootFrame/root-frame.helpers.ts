/** Under the maintenance cover nothing reaches a screen reader (as under the biometric lock). */
export const hiddenWhile = (covered: boolean) =>
  ({
    accessibilityElementsHidden: covered,
    importantForAccessibility: covered ? 'no-hide-descendants' : 'auto',
  }) as const;
