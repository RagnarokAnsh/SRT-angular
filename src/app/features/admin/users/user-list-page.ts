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

import { UserApi } from '@core/api/user-api';
import { SessionStore } from '@core/auth/session';
import { ROLE_PRIORITY } from '@core/auth/roles';
import { type RoleName, toRoleName } from '@core/models/role';
import type { ApiUser } from '@core/models/user';
import { NotifyService } from '@core/notify/notify';
import { initials } from '@shared/initials';
import { createLoader } from '@shared/loader';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { openConfirm } from '@shared/ui/confirm-dialog';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';

/** A user's main role (the API allows several; the highest one counts). */
export function primaryRole(user: ApiUser): RoleName | null {
  const names = (user.roles ?? []).map((r) => toRoleName(r.name)).filter((r): r is RoleName => r !== null);
  return ROLE_PRIORITY.find((role) => names.includes(role)) ?? null;
}

/** Where a user works, as one short line. */
export function workplace(user: ApiUser): string {
  if (user.anganwadi?.name) return user.anganwadi.name;
  return [user.sector, user.project, user.district?.name, user.state?.name]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .join(' · ');
}

@Component({
  selector: 'app-user-list-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslocoPipe,
    PluralPipe,
    ErrorState,
    PageHeader,
    Skeleton,
  ],
  templateUrl: './user-list-page.html',
  styleUrl: '../admin-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListPage {
  private readonly api = inject(UserApi);
  private readonly session = inject(SessionStore);
  private readonly notify = inject(NotifyService);
  private readonly dialog = inject(MatDialog);

  protected readonly loader = createLoader(() => this.api.list());
  protected readonly query = signal('');
  protected readonly roleFilter = signal<RoleName | ''>('');
  protected readonly deleting = signal<number | null>(null);
  protected readonly roles = ROLE_PRIORITY;
  protected readonly currentUserId = computed(() => this.session.user()?.id ?? null);
  protected readonly initials = initials;

  protected readonly visible = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    const role = this.roleFilter();
    return [...(this.loader.data() ?? [])]
      .map((user) => ({ user, role: primaryRole(user), place: workplace(user) }))
      .filter((row) => !role || row.role === role)
      .filter(
        (row) =>
          !needle ||
          row.user.name.toLocaleLowerCase().includes(needle) ||
          row.user.email.toLocaleLowerCase().includes(needle) ||
          row.place.toLocaleLowerCase().includes(needle),
      )
      .sort((a, b) => a.user.name.localeCompare(b.user.name));
  });

  protected remove(user: ApiUser): void {
    openConfirm(this.dialog, {
      titleKey: 'admin.users.deleteTitle',
      messageKey: 'admin.users.deleteMessage',
      params: { name: user.name },
      confirmKey: 'admin.users.delete',
      tone: 'danger',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.deleting.set(user.id);
          return this.api.remove(user.id);
        }),
      )
      .subscribe({
        next: () => {
          this.deleting.set(null);
          this.loader.set((this.loader.data() ?? []).filter((u) => u.id !== user.id));
          this.notify.success('admin.users.deleted', { name: user.name });
        },
        error: (error: unknown) => {
          this.deleting.set(null);
          this.notify.error(error);
        },
      });
  }
}
