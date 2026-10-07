import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, switchMap } from 'rxjs';

import { ChildApi } from '@core/api/child-api';
import { AccessService } from '@core/auth/access';
import type { Child } from '@core/models/child';
import { NotifyService } from '@core/notify/notify';
import { searchable } from '@core/util/text';
import { initials } from '@shared/initials';
import { createDeletions } from '@shared/deletions';
import { createLoader } from '@shared/loader';
import { AgePipe } from '@shared/pipes/age-pipe';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { openConfirm } from '@shared/ui/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { genderKey } from './child-labels';

@Component({
  selector: 'app-child-list-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    AgePipe,
    PluralPipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
  ],
  templateUrl: './child-list-page.html',
  styleUrl: './child-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildListPage {
  private readonly api = inject(ChildApi);
  private readonly access = inject(AccessService);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  /** Workers see their own centre, supervisors their area, administrators everyone. */
  protected readonly isWorker = this.access.worksInOwnCenter;
  /** A worker whose account isn't linked to a centre can't see or add anyone. */
  protected readonly unlinked = computed(
    () => this.isWorker() && this.access.ownCenterId() === null,
  );

  protected readonly loader = createLoader(() => this.access.visibleChildren());

  protected readonly query = signal('');
  protected readonly centerFilter = signal<number | null>(null);
  protected readonly deletions = createDeletions();

  /** Centres present in the list, for the filter (administrators and supervisors). */
  protected readonly centers = computed(() => {
    const byId = new Map<number, string>();
    for (const child of this.loader.data() ?? []) {
      if (child.anganwadiId !== null)
        byId.set(child.anganwadiId, child.centerName ?? `#${child.anganwadiId}`);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  /** Each row names its centre only when the list spans more than one. */
  protected readonly showCenter = computed(() => !this.isWorker() && this.centers().length > 1);

  /** The chosen centre, while it is still in the list (its last student may have gone). */
  protected readonly activeCenter = computed(() => {
    const id = this.centerFilter();
    return id !== null && this.centers().some((center) => center.id === id) ? id : null;
  });

  protected readonly visible = computed(() => {
    const needle = searchable(this.query());
    const center = this.activeCenter();
    return [...(this.loader.data() ?? [])]
      .filter((c) => center === null || c.anganwadiId === center)
      .filter((c) => !needle || searchable(c.name).includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly initials = initials;
  protected readonly genderKey = genderKey;

  protected remove(child: Child): void {
    openConfirm(this.dialog, {
      titleKey: 'children.deleteTitle',
      messageKey: 'children.deleteMessage',
      params: { name: child.name },
      confirmKey: 'children.delete',
      tone: 'danger',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.deletions.delete(child.id, () => this.api.remove(child.id))),
      )
      .subscribe({
        next: (outcome) => {
          this.loader.set((this.loader.data() ?? []).filter((c) => c.id !== child.id));
          this.notify.success(outcome === 'gone' ? 'common.alreadyRemoved' : 'children.deleted', {
            name: child.name,
          });
        },
        error: (error: unknown) => this.notify.error(error),
      });
  }
}
