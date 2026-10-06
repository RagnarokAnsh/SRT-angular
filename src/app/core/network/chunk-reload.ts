const RELOAD_FLAG = 'srt-chunk-reload';

/** True for the errors browsers raise when a lazily loaded file no longer exists. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

/**
 * After a new version is deployed, an open tab may ask for files that were replaced.
 * Reload once to pick up the new version; never loop if the reload doesn't help.
 */
export function reloadOnceForNewVersion(win: Window | null | undefined, targetUrl?: string): boolean {
  if (!win) return false;
  try {
    if (win.sessionStorage.getItem(RELOAD_FLAG)) return false;
    win.sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    return false;
  }
  if (targetUrl) win.location.assign(targetUrl);
  else win.location.reload();
  return true;
}

/** Call once the app is running normally, so a later deploy can trigger a reload again. */
export function clearChunkReloadFlag(win: Window | null | undefined): void {
  try {
    win?.sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}
