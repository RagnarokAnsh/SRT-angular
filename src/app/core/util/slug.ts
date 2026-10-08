/**
 * Turns a competency or domain name into the key used for translations and image file
 * names, e.g. "Emergent Reading & Book Handling" -> "emergent-reading--book-handling".
 * Must stay identical to the original rule, because the image files are named with it.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * The key of a domain. The API names domains with "and" ("Language and Literacy
 * Development"); "&" gives the same key, so either spelling finds its colours and
 * translations.
 */
export function domainSlug(name: string): string {
  return slugify(name.replace(/&/g, ' and '));
}
