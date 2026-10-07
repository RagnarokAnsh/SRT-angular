/** True if the text contains control characters (other than tab, line feed and carriage return). */
export function hasControlCharacters(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if ((code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/** Devanagari digits (०–९) as ASCII digits: Hindi keyboards type them in number fields. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966));
}

/**
 * Text as typed, made comparable and tidy: one Unicode form (keyboards can type the same
 * Hindi letter in two ways), no surrounding spaces, single spaces inside.
 */
export function tidyText(text: string): string {
  return text.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/** For search: case, spacing and how the letters were typed don't matter. */
export function searchable(text: string): string {
  return tidyText(text).toLocaleLowerCase();
}
