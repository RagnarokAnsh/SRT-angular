import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';

import { CenterApi } from '@core/api/center-api';
import { createLoader } from '@shared/loader';

import { ErrorState } from './error-state';

/** Lets users without a centre of their own (administrators) choose one. */
@Component({
  selector: 'app-center-picker',
  imports: [MatFormFieldModule, MatSelectModule, TranslocoPipe, ErrorState],
  template: `
    <div class="picker surface-card">
      <p>{{ intro() | transloco }}</p>
      @if (centers.error(); as error) {
        <app-error-state [error]="error" (retry)="centers.reload()" />
      } @else {
        <mat-form-field>
          <mat-label>{{ 'common.center' | transloco }}</mat-label>
          <mat-select [value]="value()" (selectionChange)="picked.emit($event.value)">
            @for (center of centers.data() ?? []; track center.id) {
              <mat-option [value]="center.id">{{ center.name }} ({{ center.code }})</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>
  `,
  styles: `
    .picker {
      max-width: 520px;
      margin-bottom: var(--space-5);
      padding: var(--space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CenterPicker {
  readonly intro = input('common.pickCenter');
  readonly value = input<number | null>(null);
  readonly picked = output<number>();

  private readonly api = inject(CenterApi);
  protected readonly centers = createLoader(() => this.api.list());
}
