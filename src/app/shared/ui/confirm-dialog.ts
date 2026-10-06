import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, map } from 'rxjs';

import type { TranslationParams } from '@core/i18n/params';
import { PluralPipe } from '@shared/pipes/plural-pipe';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey?: string;
  params?: TranslationParams;
  /** Makes `messageKey` a plural key (`.one` / `.other`) with this `{{count}}`. */
  count?: number;
  confirmKey?: string;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, TranslocoPipe, PluralPipe],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | transloco: data.params }}</h2>
    @if (data.messageKey) {
      <mat-dialog-content>
        <p>
          @if (data.count === undefined) {
            {{ data.messageKey | transloco: data.params }}
          } @else {
            {{ data.messageKey | plural: data.count : data.params }}
          }
        </p>
      </mat-dialog-content>
    }
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false" cdkFocusInitial>
        {{ 'common.cancel' | transloco }}
      </button>
      <button
        mat-flat-button
        type="button"
        [class.danger]="data.tone === 'danger'"
        [mat-dialog-close]="true"
      >
        {{ data.confirmKey || 'common.confirm' | transloco }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0;
    }
    .danger {
      --mat-button-filled-container-color: var(--color-danger);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Opens the confirm dialog; emits true only when the user confirms. */
export function openConfirm(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return dialog
    .open(ConfirmDialog, { data, width: 'min(440px, calc(100vw - 32px))', autoFocus: false })
    .afterClosed()
    .pipe(map((result) => result === true));
}
