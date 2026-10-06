import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';

import { CenterApi } from '@core/api/center-api';
import { ChildApi } from '@core/api/child-api';
import { UserApi } from '@core/api/user-api';
import { SessionStore } from '@core/auth/session';
import { ROLE_NAMES, type RoleName, toRoleName } from '@core/models/role';
import { createLoader } from '@shared/loader';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';

@Component({
  selector: 'app-admin-overview-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
    ErrorState,
    PageHeader,
    Skeleton,
  ],
  template: `
    <div class="page">
      <app-page-header>
        <span pageTitle>{{ 'admin.overview.title' | transloco }}</span>
        <span pageSubtitle>{{
          'admin.overview.subtitle' | transloco: { name: session.user()?.name }
        }}</span>
      </app-page-header>

      @if (loader.error(); as error) {
        <app-error-state [error]="error" (retry)="loader.reload()" />
      } @else if (!stats()) {
        <app-skeleton variant="cards" [count]="3" />
      } @else {
        @let s = stats()!;
        <section class="tiles">
          <a class="tile" routerLink="/admin/users">
            <mat-icon class="tile__icon" svgIcon="users" aria-hidden="true" />
            <span class="tile__label">{{ 'admin.overview.users' | transloco }}</span>
            <span class="tile__value">{{ s.users }}</span>
            <span class="tile__action">{{ 'admin.overview.manageUsers' | transloco }}</span>
          </a>
          <a class="tile" routerLink="/admin/centers">
            <mat-icon class="tile__icon" svgIcon="center" aria-hidden="true" />
            <span class="tile__label">{{ 'admin.overview.centers' | transloco }}</span>
            <span class="tile__value">{{ s.centers }}</span>
            <span class="tile__action">{{ 'admin.overview.manageCenters' | transloco }}</span>
          </a>
          <a class="tile" routerLink="/children">
            <mat-icon class="tile__icon" svgIcon="children" aria-hidden="true" />
            <span class="tile__label">{{ 'admin.overview.children' | transloco }}</span>
            <span class="tile__value">{{ s.children }}</span>
            <span class="tile__action">{{ 'admin.overview.viewChildren' | transloco }}</span>
          </a>
        </section>

        <section class="roles surface-card" aria-labelledby="roles-title">
          <h2 id="roles-title">{{ 'admin.overview.byRole' | transloco }}</h2>
          <ul>
            @for (role of roleNames; track role) {
              <li>
                <span>{{ 'roles.' + role | transloco }}</span>
                <strong>{{ s.byRole[role] }}</strong>
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    .tiles {
      display: grid;
      gap: var(--space-3);
      margin-bottom: var(--space-6);

      @include up(sm) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .tile {
      @include card;

      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-areas:
        'icon label'
        'icon value'
        'icon action';
      column-gap: var(--space-4);
      padding: var(--space-5);
      color: inherit;
      text-decoration: none;
      transition:
        box-shadow 0.15s,
        border-color 0.15s;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-2);
      }
    }
    .tile__icon {
      grid-area: icon;
      width: 40px;
      height: 40px;
      padding: 8px;
      border-radius: var(--radius-md);
      background: var(--color-secondary-soft);
      color: var(--color-secondary-strong);
    }
    .tile__label {
      grid-area: label;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .tile__value {
      grid-area: value;
      color: var(--color-text-strong);
      font-size: var(--text-3xl);
      font-weight: 700;
      line-height: 1.2;
    }
    .tile__action {
      grid-area: action;
      color: var(--color-secondary-strong);
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .roles {
      max-width: 560px;
      padding: var(--space-5);

      h2 {
        font-size: var(--text-lg);
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: flex;
        justify-content: space-between;
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);

        &:last-child {
          border-bottom: 0;
        }
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOverviewPage {
  protected readonly session = inject(SessionStore);
  private readonly userApi = inject(UserApi);
  private readonly centerApi = inject(CenterApi);
  private readonly childApi = inject(ChildApi);

  protected readonly roleNames = ROLE_NAMES;
  protected readonly loader = createLoader(() =>
    forkJoin({
      users: this.userApi.list(),
      centers: this.centerApi.list(),
      children: this.childApi.list(),
    }),
  );

  protected readonly stats = computed(() => {
    const data = this.loader.data();
    if (!data) return null;
    const byRole = Object.fromEntries(ROLE_NAMES.map((r) => [r, 0])) as Record<RoleName, number>;
    for (const user of data.users) {
      for (const role of user.roles ?? []) {
        const name = toRoleName(role.name);
        if (name) byRole[name]++;
      }
    }
    return {
      users: data.users.length,
      centers: data.centers.length,
      children: data.children.length,
      byRole,
    };
  });
}
