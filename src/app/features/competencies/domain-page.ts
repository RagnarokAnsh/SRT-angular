import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { CompetencyApi } from '@core/api/competency-api';
import { domainColors } from '@core/catalog/framework';
import { createLoader } from '@shared/loader';
import { DomainNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { CompetencyCard } from './competency-card';

/**
 * One domain of development and its competencies, in the domain's colour (as on the wheel).
 * Opened from the home page's wheel or from "School Readiness – Domains".
 */
@Component({
  selector: 'app-domain-page',
  imports: [
    RouterLink,
    MatIconModule,
    TranslocoPipe,
    DomainNamePipe,
    PluralPipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
    CompetencyCard,
  ],
  template: `
    <div class="page">
      @if (loader.error(); as error) {
        <app-page-header backLink="/competencies" [backLabel]="'nav.domains' | transloco" />
        <app-error-state [error]="error" (retry)="loader.reload()" />
      } @else if (!loader.data()) {
        <app-skeleton variant="block" [count]="1" />
        <app-skeleton variant="rows" [count]="3" />
      } @else if (view(); as view) {
        <div class="band" [style.--domain-color]="view.colors.color" aria-hidden="true"></div>
        <app-page-header backLink="/competencies" [backLabel]="'nav.domains' | transloco">
          <span pageTitle class="title">
            <span class="swatch" [style.background]="view.colors.color" aria-hidden="true"></span>
            {{ view.domain | domainName }}
          </span>
          <span pageSubtitle>{{
            'competencies.count' | plural: view.domain.competencies.length
          }}</span>
        </app-page-header>

        <ul class="grid">
          @for (competency of view.domain.competencies; track competency.id) {
            <li><app-competency-card [competency]="competency" [tint]="view.colors.tint" /></li>
          }
        </ul>

        <nav class="steps" [attr.aria-label]="'domainPage.otherDomains' | transloco">
          @if (view.previous; as previous) {
            <a class="step" [routerLink]="['/competencies/domain', previous.slug]">
              <mat-icon svgIcon="chevron-left" aria-hidden="true" />
              <span class="step__text">
                <span class="step__label">{{ 'domainPage.previous' | transloco }}</span>
                <span class="step__name">{{ previous | domainName }}</span>
              </span>
            </a>
          }
          @if (view.next; as next) {
            <a class="step step--next" [routerLink]="['/competencies/domain', next.slug]">
              <span class="step__text">
                <span class="step__label">{{ 'domainPage.next' | transloco }}</span>
                <span class="step__name">{{ next | domainName }}</span>
              </span>
              <mat-icon svgIcon="chevron-right" aria-hidden="true" />
            </a>
          }
        </nav>
      } @else {
        <app-page-header backLink="/competencies" [backLabel]="'nav.domains' | transloco" />
        <app-state-message
          icon="not-found"
          [title]="'domainPage.notFoundTitle' | transloco"
          [message]="'domainPage.notFoundMessage' | transloco"
        />
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    .band {
      height: 6px;
      margin-bottom: var(--space-4);
      border-radius: var(--radius-pill);
      background: var(--domain-color);
    }
    .title {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
    }
    .swatch {
      flex: none;
      width: 18px;
      height: 18px;
      border-radius: 5px;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;

      @include up(sm) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @include up(lg) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .steps {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      margin-top: var(--space-8);

      @include up(sm) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .step {
      @include card;

      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 64px;
      padding: var(--space-3) var(--space-4);
      color: inherit;
      text-decoration: none;

      &:hover {
        border-color: var(--color-border-strong);
      }

      mat-icon {
        flex: none;
        color: var(--color-text-muted);
      }
    }
    .step--next {
      justify-content: flex-end;
      text-align: end;

      @include up(sm) {
        grid-column: 2;
      }
    }
    .step__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .step__label {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .step__name {
      color: var(--color-text-strong);
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainPage {
  private readonly api = inject(CompetencyApi);

  /** Route parameter: the domain's slug (as used by the wheel). */
  readonly slug = input.required<string>();

  protected readonly loader = createLoader(() => this.api.domains());

  /** Null when no domain has this slug. */
  protected readonly view = computed(() => {
    const domains = this.loader.data() ?? [];
    const index = domains.findIndex((d) => d.slug === this.slug());
    if (index < 0) return null;
    const domain = domains[index];
    return {
      domain,
      colors: domainColors(domain.slug),
      previous: domains[index - 1] ?? null,
      next: domains[index + 1] ?? null,
    };
  });
}
