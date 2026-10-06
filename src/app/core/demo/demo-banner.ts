import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslocoPipe } from '@jsverse/transloco';

import { openConfirm } from '../../shared/ui/confirm-dialog';
import { DemoDb } from './demo-db';

@Component({
  selector: 'app-demo-banner',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule, TranslocoPipe],
  template: `
    <div class="banner" role="note">
      <mat-icon svgIcon="demo" aria-hidden="true" />
      <p class="text">
        <strong>{{ 'demo.title' | transloco }}</strong>
        <span class="detail">{{ 'demo.message' | transloco }}</span>
      </p>
      <mat-slide-toggle [checked]="db.offline()" (change)="db.setOffline($event.checked)">
        {{ 'demo.simulateOffline' | transloco }}
      </mat-slide-toggle>
      <button mat-button type="button" class="reset" (click)="reset()">
        <mat-icon svgIcon="reset" aria-hidden="true" />
        <span class="reset__label">{{ 'demo.reset' | transloco }}</span>
      </button>
    </div>
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      padding: var(--space-2) var(--page-gutter);
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
      font-size: var(--text-sm);
    }
    mat-icon {
      flex: none;
      width: 20px;
      height: 20px;
    }
    .text {
      flex: 1 1 auto;
      margin: 0;
    }
    .reset {
      --mat-button-text-label-text-color: var(--color-on-warning-soft);
    }
    .detail {
      display: none;
      margin-inline-start: var(--space-1);
    }
    @media (min-width: 900px) {
      .detail {
        display: inline;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoBanner {
  protected readonly db = inject(DemoDb);
  private readonly dialog = inject(MatDialog);
  private readonly document = inject(DOCUMENT);

  protected reset(): void {
    openConfirm(this.dialog, {
      titleKey: 'demo.resetTitle',
      messageKey: 'demo.resetMessage',
      confirmKey: 'demo.reset',
      tone: 'danger',
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.db.reset();
      this.document.location.reload();
    });
  }
}
