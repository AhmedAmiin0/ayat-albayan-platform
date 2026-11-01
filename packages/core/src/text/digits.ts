/**
 * Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western ones; every other character stays. An
 * Arabic keypad (phone or desktop) types them into codes, amounts, phones and confirmations.
 */
export function asciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}
