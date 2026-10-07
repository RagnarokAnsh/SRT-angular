import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoPipe } from '@jsverse/transloco';

import { AccessService } from '@core/auth/access';
import type { ApiCenter } from '@core/models/center';
import { createLoader } from '@shared/loader';

import { ErrorState } from './error-state';

/** Lets users without a centre of their own choose one of the centres they may see. */
@Component({
  selector: 'app-center-picker',
  imports: [MatFormFieldModule, MatSelectModule, TranslocoPipe, ErrorState],
  template: `
    <div class="picker surface-card">
      <p>{{ intro() | transloco }}</p>
      @if (centers.error(); as error) {
        <app-error-state [error]="error" (retry)="centers.reload()" />
      } @else if (centers.data()?.length === 0) {
        <p class="none">{{ 'common.noCenters' | transloco }}</p>
      } @else {
        <mat-form-field>
          <mat-label>{{ 'common.center' | transloco }}</mat-label>
          <mat-select [value]="value()" (selectionChange)="choose($event.value)">
            @for (center of centers.data() ?? []; track center.id) {
              <mat-option [value]="center.id">{{ center.name }} ({{ center.code }})</mat-option>
            }
          </mat-select>
          @if (centers.loading() && !centers.data()) {
            <mat-hint>{{ 'common.loading' | transloco }}</mat-hint>
          }
        </mat-form-field>
      }
    </div>
  `,
  styles: `
    .none {
      color: var(--color-text-muted);
    }
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
  readonly picked = output<ApiCenter>();

  private readonly access = inject(AccessService);
  protected readonly centers = createLoader(() => this.access.visibleCenters());

  protected choose(id: number): void {
    const center = this.centers.data()?.find((c) => c.id === id);
    if (center) this.picked.emit(center);
  }
}
