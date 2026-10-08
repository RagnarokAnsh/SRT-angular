import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { map } from 'rxjs';

import { CompetencyApi } from '@core/api/competency-api';
import { SessionStore } from '@core/auth/session';
import { domainColors } from '@core/catalog/framework';
import { activityVideos, competencyImage } from '@core/catalog/media';
import { createLoader } from '@shared/loader';
import {
  CompetencyDescriptionPipe,
  CompetencyNamePipe,
  DomainNamePipe,
} from '@shared/pipes/catalog-pipes';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { LearningProcess } from './learning-process';

const CHECKLIST = ['understand', 'videos', 'practised', 'ready'] as const;

@Component({
  selector: 'app-competency-detail-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    TranslocoPipe,
    DomainNamePipe,
    CompetencyNamePipe,
    CompetencyDescriptionPipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
    LearningProcess,
  ],
  templateUrl: './competency-detail-page.html',
  styleUrl: './competency-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetencyDetailPage {
  private readonly api = inject(CompetencyApi);
  private readonly session = inject(SessionStore);

  /** Route parameter. */
  readonly id = input.required({ transform: numberAttribute });

  protected readonly loader = createLoader(
    () =>
      this.api.domains().pipe(
        map((domains) => {
          for (const domain of domains) {
            const competency = domain.competencies.find((c) => c.id === this.id());
            if (competency) return { competency, domain };
          }
          return null;
        }),
      ),
    { lazy: true },
  );

  protected readonly view = computed(() => {
    const found = this.loader.data();
    if (!found) return null;
    const { competency, domain } = found;
    return {
      competency,
      domain,
      colors: domainColors(domain.slug),
      image: competencyImage(competency.slug),
      videos: activityVideos(competency.slug),
    };
  });

  protected readonly checklist = CHECKLIST;
  protected readonly checked = signal<ReadonlySet<string>>(new Set());
  protected readonly ready = computed(() => this.checked().size === CHECKLIST.length);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.checked.set(this.readTicks(id));
        this.loader.reload();
      });
    });
  }

  protected toggle(item: string, checked: boolean): void {
    const next = new Set(this.checked());
    if (checked) next.add(item);
    else next.delete(item);
    this.checked.set(next);
    this.saveTicks(this.id(), next);
  }

  /** Workers confirm the checklist once per competency; it is remembered on this device. */
  private storageKey(id: number): string {
    return `srt-ready:${this.session.user()?.id ?? 0}:${id}`;
  }

  /** The ticked statements, remembered on this device (even when not all are ticked yet). */
  private readTicks(id: number): ReadonlySet<string> {
    try {
      const stored = localStorage.getItem(this.storageKey(id));
      if (stored === '1') return new Set(CHECKLIST); // saved by an earlier version: all ticked
      const known = new Set<string>(CHECKLIST);
      return new Set((stored ?? '').split(',').filter((item) => known.has(item)));
    } catch {
      return new Set();
    }
  }

  private saveTicks(id: number, ticks: ReadonlySet<string>): void {
    try {
      if (ticks.size) localStorage.setItem(this.storageKey(id), [...ticks].join(','));
      else localStorage.removeItem(this.storageKey(id));
    } catch {
      /* not remembered; fine */
    }
  }
}
