import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Page title with optional back link, subtitle and actions (projected). */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, MatIconModule, TranslocoPipe],
  template: `
    @if (backLink(); as link) {
      <a class="back" [routerLink]="link">
        <mat-icon svgIcon="arrow-left" aria-hidden="true" />
        <span>{{ backLabel() || ('common.back' | transloco) }}</span>
      </a>
    }
    <div class="row">
      <div class="titles">
        <h1>
          <ng-content select="[pageTitle]" />
        </h1>
        <div class="subtitle"><ng-content select="[pageSubtitle]" /></div>
      </div>
      <div class="actions"><ng-content select="[pageActions]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-5);
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      min-height: 40px;
      margin-bottom: var(--space-2);
      color: var(--color-text-muted);
      font-weight: 600;
      text-decoration: none;
    }
    .back:hover {
      color: var(--color-text-strong);
    }
    .back mat-icon {
      width: 20px;
      height: 20px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .titles {
      min-width: 0;
      flex: 1 1 260px;
    }
    h1 {
      margin: 0;
    }
    .subtitle:not(:empty) {
      margin-top: var(--space-1);
      color: var(--color-text-muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly backLink = input<string | unknown[] | null>(null);
  readonly backLabel = input<string>('');
}
