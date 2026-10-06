import { clearChunkReloadFlag, isChunkLoadError, reloadOnceForNewVersion } from './chunk-reload';

describe('chunk reload', () => {
  beforeEach(() => sessionStorage.clear());

  it('recognises missing-chunk errors from each browser', () => {
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /chunk-1.js')),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads only once until cleared', () => {
    const assign = vi.fn();
    const win = { sessionStorage, location: { assign, reload: vi.fn() } } as unknown as Window;
    expect(reloadOnceForNewVersion(win, '/dashboard')).toBe(true);
    expect(assign).toHaveBeenCalledWith('/dashboard');
    expect(reloadOnceForNewVersion(win, '/dashboard')).toBe(false);
    clearChunkReloadFlag(win);
    expect(reloadOnceForNewVersion(win, '/dashboard')).toBe(true);
  });
});
