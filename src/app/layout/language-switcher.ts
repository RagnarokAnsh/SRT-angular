import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';
import type { LanguageCode } from '@core/i18n/languages';
import { NotifyService } from '@core/notify/notify';

/** Language menu in the top bar (each language is listed in its own script). */
@Component({
  selector: 'app-language-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  template: `
    <button
      mat-button
      type="button"
      class="trigger"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="('language.change' | transloco) + ': ' + language.info().label"
    >
      <mat-icon svgIcon="language" aria-hidden="true" />
      <span class="label label--full" [attr.lang]="language.current()">{{
        language.info().label
      }}</span>
      <span class="label label--short" [attr.lang]="language.current()">{{
        language.info().short
      }}</span>
    </button>
    <mat-menu #menu="matMenu" xPosition="before">
      @for (lang of language.languages; track lang.code) {
        <button
          mat-menu-item
          type="button"
          role="menuitemradio"
          [attr.aria-checked]="lang.code === language.current()"
          [attr.lang]="lang.code"
          (click)="switchTo(lang.code)"
        >
          <mat-icon
            [svgIcon]="lang.code === language.current() ? 'check' : 'circle'"
            aria-hidden="true"
          />
          <span>{{ lang.label }}</span>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    .trigger {
      --mat-button-text-label-text-color: var(--color-text-strong);
      min-width: 0;
      padding-inline: var(--space-2);
    }
    .label--full {
      display: none;
    }
    @media (min-width: 600px) {
      .label--full {
        display: inline;
      }
      .label--short {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  protected readonly language = inject(LanguageService);
  private readonly notify = inject(NotifyService);
  private readonly document = inject(DOCUMENT);

  protected switchTo(lang: LanguageCode): void {
    void this.language.use(lang).then((switched) => {
      if (switched || this.language.current() === lang) return;
      // The browser won't fetch a file again after it failed once in this page: only a
      // reload can, and it starts in the chosen language.
      this.notify.errorKey('language.loadFailed', undefined, {
        labelKey: 'common.reload',
        run: () => {
          this.language.remember(lang);
          this.document.location.reload();
        },
      });
    });
  }
}
