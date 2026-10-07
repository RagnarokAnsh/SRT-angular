import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { createLoader } from './loader';

describe('createLoader', () => {
  it('loads, reports errors, and keeps the last data while reloading', () => {
    const results = [of(1), throwError(() => new Error('boom'))];
    const loader = TestBed.runInInjectionContext(() => createLoader(() => results.shift()!));
    expect(loader.data()).toBe(1);
    loader.reload();
    expect(loader.error()?.kind).toBe('unknown');
    expect(loader.data()).toBe(1);
  });

  it('clear() forgets the data and ignores a request still in flight', () => {
    const pending = new Subject<string>();
    const sources = [of('centre A'), pending];
    const loader = TestBed.runInInjectionContext(() =>
      createLoader(() => sources.shift()!, { lazy: true }),
    );
    loader.reload();
    expect(loader.data()).toBe('centre A');

    loader.reload(); // slow request for centre B
    expect(loader.loading()).toBe(true);
    loader.clear(); // the page switched subject again
    pending.next('late answer');
    expect(loader.data()).toBeUndefined();
    expect(loader.loading()).toBe(false);
    expect(loader.error()).toBeNull();
  });
});
