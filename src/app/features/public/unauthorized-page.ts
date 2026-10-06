import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '@core/auth/auth';
import { StateMessage } from '@shared/ui/state-message';

@Component({
  selector: 'app-unauthorized-page',
  imports: [RouterLink, MatButtonModule, TranslocoPipe, StateMessage],
  template: `
    <div class="page page--narrow">
      <app-state-message
        icon="lock"
        [title]="'unauthorized.heading' | transloco"
        [message]="'unauthorized.message' | transloco"
      >
        <a mat-flat-button [routerLink]="homeUrl()">{{ 'unauthorized.home' | transloco }}</a>
      </app-state-message>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnauthorizedPage {
  private readonly auth = inject(AuthService);
  protected readonly homeUrl = computed(() => this.auth.homeUrl());
}
