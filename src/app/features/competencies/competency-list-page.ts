import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { CompetencyApi } from '@core/api/competency-api';
import { CatalogText } from '@core/catalog/catalog-text';
import { domainColors } from '@core/catalog/framework';
import { LanguageService } from '@core/i18n/language';
import { createLoader } from '@shared/loader';
import { DomainNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { CompetencyCard } from './competency-card';

@Component({
  selector: 'app-competency-list-page',
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
    DomainNamePipe,
    PluralPipe,
    CompetencyCard,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
  ],
  template: `
    <div class="page">
      <app-page-header backLink="/home" [backLabel]="'nav.home' | transloco">
        <span pageTitle>{{ 'competencies.title' | transloco }}</span>
        <span pageSubtitle>{{ 'competencies.subtitle' | transloco }}</span>
      </app-page-header>

      @if (loader.error(); as error) {
        <app-error-state [error]="error" (retry)="loader.reload()" />
      } @else if (loader.loading() && !loader.data()) {
        <app-skeleton variant="rows" [count]="6" />
      } @else if (domains().length === 0 && !query()) {
        <app-state-message icon="domains" [title]="'competencies.empty' | transloco" />
      } @else {
        <mat-form-field class="search">
          <mat-label>{{ 'competencies.search' | transloco }}</mat-label>
          <mat-icon matPrefix svgIcon="search" aria-hidden="true" />
          <input
            matInput
            type="search"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
        </mat-form-field>

        @for (domain of domains(); track domain.id) {
          <section
            class="domain"
            [style.--domain-color]="domain.color"
            [attr.aria-labelledby]="'domain-' + domain.id"
          >
            <h2 class="domain__title" [id]="'domain-' + domain.id">
              <a class="domain__link" [routerLink]="['/competencies/domain', domain.slug]">
                <span class="swatch" aria-hidden="true"></span>
                <span class="domain__name">{{ domain | domainName }}</span>
                <span class="domain__count">{{
                  'competencies.count' | plural: domain.competencies.length
                }}</span>
                <mat-icon svgIcon="chevron-right" aria-hidden="true" />
              </a>
            </h2>
            <ul class="grid">
              @for (competency of domain.competencies; track competency.id) {
                <li><app-competency-card [competency]="competency" [tint]="domain.tint" /></li>
              }
            </ul>
          </section>
        } @empty {
          <app-state-message
            icon="search"
            [title]="'competencies.noMatch' | transloco: { query: query() }"
          />
        }
      }
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    .search {
      max-width: 420px;
      margin-bottom: var(--space-2);
    }
    .domain {
      margin-top: var(--space-6);
    }
    .domain__title {
      margin-bottom: var(--space-3);
      font-size: var(--text-lg);
    }
    // The heading opens the domain's own page; its colour matches the wheel.
    .domain__link {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      min-height: var(--touch-target);
      padding: var(--space-1) var(--space-3) var(--space-1) 0;
      border-radius: var(--radius-md);
      color: var(--color-text-strong);
      text-decoration: none;

      &:hover .domain__name {
        text-decoration: underline;
        text-decoration-color: var(--domain-color);
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
      }

      mat-icon {
        color: var(--color-text-muted);
      }
    }
    .domain__count {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: 500;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      background: var(--domain-color);
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetencyListPage {
  private readonly api = inject(CompetencyApi);
  private readonly text = inject(CatalogText);
  private readonly language = inject(LanguageService);

  protected readonly loader = createLoader(() => this.api.domains());
  protected readonly query = signal('');

  /** Domains with colours and thumbnails, filtered by the search box (any language). */
  protected readonly domains = computed(() => {
    this.language.current();
    const needle = this.query().trim().toLocaleLowerCase();
    return (this.loader.data() ?? [])
      .map((domain) => ({
        ...domain,
        ...domainColors(domain.slug),
        competencies: domain.competencies.filter(
          (competency) =>
            !needle ||
            competency.name.toLocaleLowerCase().includes(needle) ||
            this.text.competencyName(competency).toLocaleLowerCase().includes(needle),
        ),
      }))
      .filter((domain) => domain.competencies.length > 0);
  });
}
