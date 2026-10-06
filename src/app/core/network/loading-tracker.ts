import { Injectable, computed, signal } from '@angular/core';

/** Counts API requests in flight, for the thin progress bar at the top of the page. */
@Injectable({ providedIn: 'root' })
export class LoadingTracker {
  private readonly pending = signal(0);

  readonly active = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((n) => n + 1);
  }

  stop(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }
}
