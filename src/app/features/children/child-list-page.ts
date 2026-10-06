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
import { SessionStore } from '@core/auth/session';
import type { Child } from '@core/models/child';
import { NotifyService } from '@core/notify/notify';
import { initials } from '@shared/initials';
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
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  /** Workers see their own centre; administrators and supervisors see every child sent. */
  protected readonly ownCenterId = this.session.anganwadiId;
  protected readonly isWorker = computed(() => this.session.primaryRole() === 'aww');

  protected readonly loader = createLoader(() => {
    const centerId = this.ownCenterId();
    return this.isWorker() && centerId !== null
      ? this.api.listForCenter(centerId)
      : this.api.list();
  });

  protected readonly query = signal('');
  protected readonly centerFilter = signal<number | null>(null);
  protected readonly deleting = signal<number | null>(null);

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

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    const center = this.centerFilter();
    return [...(this.loader.data() ?? [])]
      .filter((c) => center === null || c.anganwadiId === center)
      .filter((c) => !needle || c.name.toLocaleLowerCase().includes(needle))
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
        switchMap(() => {
          this.deleting.set(child.id);
          return this.api.remove(child.id);
        }),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.loader.set((this.loader.data() ?? []).filter((c) => c.id !== child.id));
          this.notify.success('children.deleted', { name: child.name });
        },
        error: (error: unknown) => {
          this.deleting.set(null);
          this.notify.error(error);
        },
      });
  }
}
