import { Injectable, signal } from '@angular/core';

import { type DemoData, createDemoData } from './demo-fixtures';

/** Bumped when the sample data changes, so returning visitors get the new data. */
const DATA_KEY = 'srt-demo-data-v3';
const OLD_DATA_KEYS = ['srt-demo-data-v1', 'srt-demo-data-v2'];
const OFFLINE_KEY = 'srt-demo-offline';

/** Demo-mode data, kept in this browser's localStorage. */
@Injectable({ providedIn: 'root' })
export class DemoDb {
  data: DemoData = this.load();
  /** When true, every API call fails as if the server could not be reached. */
  readonly offline = signal(this.readFlag(OFFLINE_KEY));

  save(): void {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(this.data));
    } catch {
      /* demo data just won't persist */
    }
  }

  reset(): void {
    this.data = createDemoData();
    this.save();
  }

  setOffline(offline: boolean): void {
    this.offline.set(offline);
    try {
      if (offline) localStorage.setItem(OFFLINE_KEY, '1');
      else localStorage.removeItem(OFFLINE_KEY);
    } catch {
      /* ignore */
    }
  }

  nextId(items: { id: number }[]): number {
    return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }

  private load(): DemoData {
    try {
      for (const key of OLD_DATA_KEYS) localStorage.removeItem(key);
      const stored = localStorage.getItem(DATA_KEY);
      if (stored) return JSON.parse(stored) as DemoData;
    } catch {
      /* fall through to fresh data */
    }
    return createDemoData();
  }

  private readFlag(key: string): boolean {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }
}
