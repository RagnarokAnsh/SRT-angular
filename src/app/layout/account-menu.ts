import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '@core/auth/auth';
import { SessionStore } from '@core/auth/session';
import { initials } from '@shared/initials';
import { openConfirm } from '@shared/ui/confirm-dialog';

@Component({
  selector: 'app-account-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, TranslocoPipe],
  template: `
    <button
      mat-button
      type="button"
      class="trigger"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'nav.accountMenu' | transloco"
    >
      <span class="avatar" aria-hidden="true">{{ initials() }}</span>
      <span class="name">{{ session.user()?.name }}</span>
      <mat-icon svgIcon="chevron-down" iconPositionEnd aria-hidden="true" />
    </button>
    <mat-menu #menu="matMenu" xPosition="before" class="account-menu">
      <div class="summary">
        <span class="summary__label">{{ 'nav.signedInAs' | transloco }}</span>
        <strong>{{ session.user()?.name }}</strong>
        <span class="summary__email">{{ session.user()?.email }}</span>
        @if (session.primaryRole(); as role) {
          <span class="role">{{ 'roles.' + role | transloco }}</span>
        }
        @if (session.user()?.anganwadi?.name; as center) {
          <span class="summary__center">{{ center }}</span>
        }
      </div>
      <mat-divider />
      <button mat-menu-item type="button" (click)="logout()">
        <mat-icon svgIcon="logout" aria-hidden="true" />
        <span>{{ 'nav.logout' | transloco }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .trigger {
      --mat-button-text-label-text-color: var(--color-text-strong);
      min-width: 0;
      padding-inline: var(--space-1) var(--space-2);
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      margin-inline-end: var(--space-2);
      border-radius: 50%;
      background: var(--color-secondary-soft);
      color: var(--color-secondary-strong);
      font-size: var(--text-sm);
      font-weight: 700;
    }
    .name {
      display: none;
      max-width: 16ch;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (min-width: 900px) {
      .name {
        display: inline;
      }
    }
    .summary {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 220px;
      padding: var(--space-3) var(--space-4);
    }
    .summary__label,
    .summary__email,
    .summary__center {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .role {
      align-self: flex-start;
      margin-top: var(--space-1);
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--color-primary-soft);
      color: var(--color-on-primary-soft);
      font-size: var(--text-xs);
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  protected readonly session = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  protected readonly initials = computed(() => initials(this.session.user()?.name));

  protected logout(): void {
    openConfirm(this.dialog, {
      titleKey: 'logout.title',
      messageKey: 'logout.message',
      confirmKey: 'nav.logout',
    }).subscribe((confirmed) => {
      if (confirmed) void this.auth.logout('manual');
    });
  }
}
