/** Accepts Arabic-Indic digits and returns trimmed Western digits. */
export const ascii = (v: string): string =>
  v.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
