import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { type Observable, catchError, filter, forkJoin, map, of, switchMap } from 'rxjs';

import { CenterApi } from '@core/api/center-api';
import { LocationCache } from '@core/api/location-cache';
import type { ApiCenter } from '@core/models/center';
import { NotifyService } from '@core/notify/notify';
import { createLoader } from '@shared/loader';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { openConfirm } from '@shared/ui/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

@Component({
  selector: 'app-center-list-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
    PluralPipe,
    ErrorState,
    PageHeader,
    Skeleton,
    StateMessage,
  ],
  templateUrl: './center-list-page.html',
  styleUrl: '../admin-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CenterListPage {
  private readonly api = inject(CenterApi);
  private readonly locations = inject(LocationCache);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  protected readonly loader = createLoader(() => this.api.list());
  protected readonly query = signal('');
  protected readonly deleting = signal<number | null>(null);

  /** District and state names for the centres shown (each list is fetched once). */
  private readonly names = toSignal(
    toObservable(this.loader.data).pipe(
      switchMap((centers) => {
        const countryIds = [...new Set((centers ?? []).map((c) => c.country_id).filter(Boolean))];
        const stateIds = [...new Set((centers ?? []).map((c) => c.state_id).filter(Boolean))];
        if (!countryIds.length) return of({ states: new Map<number, string>(), districts: new Map<number, string>() });
        // Names are a nicety: a failed lookup just leaves them out.
        const safe = <T>(source: Observable<T[]>) => source.pipe(catchError(() => of([] as T[])));
        return forkJoin({
          states: forkJoin(countryIds.map((id) => safe(this.locations.states(id)))),
          districts: forkJoin(stateIds.map((id) => safe(this.locations.districts(id)))),
        }).pipe(
          map(({ states, districts }) => ({
            states: new Map(states.flat().map((s) => [s.id, s.name])),
            districts: new Map(districts.flat().map((d) => [d.id, d.name])),
          })),
        );
      }),
    ),
    { initialValue: { states: new Map<number, string>(), districts: new Map<number, string>() } },
  );

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    const names = this.names();
    return [...(this.loader.data() ?? [])]
      .map((center) => ({
        center,
        place: [
          center.sector,
          center.project,
          names.districts.get(center.district_id),
          names.states.get(center.state_id),
        ]
          .filter((part): part is string => !!part && part.trim().length > 0)
          .join(' · '),
      }))
      .filter(
        (row) =>
          !needle ||
          row.center.name.toLocaleLowerCase().includes(needle) ||
          row.center.code.toLocaleLowerCase().includes(needle) ||
          row.place.toLocaleLowerCase().includes(needle),
      )
      .sort((a, b) => a.center.name.localeCompare(b.center.name));
  });

  protected remove(center: ApiCenter): void {
    openConfirm(this.dialog, {
      titleKey: 'admin.centers.deleteTitle',
      messageKey: 'admin.centers.deleteMessage',
      params: { name: center.name },
      confirmKey: 'admin.centers.delete',
      tone: 'danger',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.deleting.set(center.id);
          return this.api.remove(center.id);
        }),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.loader.set((this.loader.data() ?? []).filter((c) => c.id !== center.id));
          this.notify.success('admin.centers.deleted', { name: center.name });
        },
        error: (error: unknown) => {
          this.deleting.set(null);
          this.notify.error(error);
        },
      });
  }
}
