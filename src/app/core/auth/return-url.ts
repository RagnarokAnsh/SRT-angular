import { hasControlCharacters } from '../util/text';

/**
 * Only same-app paths are accepted as a post-login destination, so a crafted link such as
 * `/login?returnUrl=//evil.example` cannot send users to another site.
 */
export function safeReturnUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  if (url.includes('\\') || hasControlCharacters(url) || /[\t\n\r]/.test(url)) return null;
  if (url === '/login' || url.startsWith('/login?') || url.startsWith('/login/')) return null;
  return url;
}
