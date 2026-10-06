import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Whether the browser has a network connection (field workers often have patchy signal). */
@Injectable({ providedIn: 'root' })
export class Connectivity {
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly onlineSignal = signal(this.read());

  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    const update = () => this.onlineSignal.set(this.read());
    this.view?.addEventListener('online', update);
    this.view?.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      this.view?.removeEventListener('online', update);
      this.view?.removeEventListener('offline', update);
    });
  }

  private read(): boolean {
    return this.view?.navigator.onLine ?? true;
  }
}
