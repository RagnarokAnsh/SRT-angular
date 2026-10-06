import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '@core/auth/auth';
import { StateMessage } from '@shared/ui/state-message';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, MatButtonModule, TranslocoPipe, StateMessage],
  template: `
    <div class="page page--narrow">
      <app-state-message
        icon="not-found"
        [title]="'notFound.heading' | transloco"
        [message]="'notFound.message' | transloco"
      >
        <a mat-flat-button [routerLink]="homeUrl()">{{ 'notFound.home' | transloco }}</a>
      </app-state-message>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly auth = inject(AuthService);
  protected readonly homeUrl = computed(() => this.auth.homeUrl());
}
