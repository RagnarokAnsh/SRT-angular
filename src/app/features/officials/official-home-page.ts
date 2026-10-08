import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { ROLE_LOCATION_DEPTH } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session';
import { PageHeader } from '@shared/ui/page-header';

/** Dashboard for state, district, project and sector officials (reports come with the API). */
@Component({
  selector: 'app-official-home-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslocoPipe, PageHeader],
  template: `
    <div class="page page--narrow">
      <app-page-header>
        <span pageTitle>{{ 'dashboard.title' | transloco }}</span>
        <span pageSubtitle>
          {{ 'officials.welcome' | transloco: { name: session.user()?.name } }}
          @if (session.primaryRole(); as role) {
            · {{ 'roles.' + role | transloco }}
          }
        </span>
      </app-page-header>

      @if (area().length) {
        <section class="card surface-card" aria-labelledby="area-title">
          <h2 id="area-title" class="card__title">
            <mat-icon svgIcon="location" aria-hidden="true" />
            {{ 'officials.yourArea' | transloco }}
          </h2>
          <dl class="area">
            @for (item of area(); track item.key) {
              <div class="area__row">
                <dt>{{ item.key | transloco }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            }
          </dl>
        </section>
      }

      <section class="card surface-card" aria-labelledby="next-title">
        <h2 id="next-title" class="card__title">
          <mat-icon svgIcon="chart-box" aria-hidden="true" />
          {{ 'officials.reportsTitle' | transloco }}
        </h2>
        <p>{{ 'officials.reportsMessage' | transloco }}</p>
        <div class="actions">
          @if (session.hasAnyRole('supervisor')) {
            <a mat-flat-button routerLink="/students">
              <mat-icon svgIcon="children" aria-hidden="true" />
              {{ 'officials.viewChildren' | transloco }}
            </a>
          }
          <a mat-stroked-button routerLink="/home">
            <mat-icon svgIcon="domains" aria-hidden="true" />
            {{ 'officials.viewFramework' | transloco }}
          </a>
        </div>
      </section>
    </div>
  `,
  styles: `
    .card {
      margin-bottom: var(--space-4);
      padding: var(--space-5);
    }
    .card__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-lg);

      mat-icon {
        color: var(--color-secondary-strong);
      }
    }
    .area {
      display: grid;
      gap: var(--space-2);
      margin: 0;
    }
    .area__row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-1) var(--space-4);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: 0;
      }
    }
    dt {
      color: var(--color-text-muted);
    }
    dd {
      margin: 0;
      color: var(--color-text-strong);
      font-weight: 600;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficialHomePage {
  protected readonly session = inject(SessionStore);

  /** The parts of the location this official is responsible for. */
  protected readonly area = computed(() => {
    const user = this.session.user();
    const role = this.session.primaryRole();
    if (!user || !role) return [];
    const depth = ROLE_LOCATION_DEPTH[role];
    const items = [
      { key: 'location.country', value: user.country?.name },
      { key: 'location.state', value: user.state?.name },
      { key: 'location.district', value: user.district?.name },
      { key: 'location.project', value: user.project },
      { key: 'location.sector', value: user.sector },
    ];
    return items
      .slice(0, depth)
      .filter(
        (item): item is { key: string; value: string } => !!item.value && item.value.trim() !== '',
      );
  });
}
