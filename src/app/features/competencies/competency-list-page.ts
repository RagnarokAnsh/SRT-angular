import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { CompetencyApi } from '@core/api/competency-api';
import { CatalogText } from '@core/catalog/catalog-text';
import { domainColors } from '@core/catalog/framework';
import { competencyThumbnail } from '@core/catalog/media';
import { LanguageService } from '@core/i18n/language';
import { createLoader } from '@shared/loader';
import {
  CompetencyDescriptionPipe,
  CompetencyNamePipe,
  DomainNamePipe,
} from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

@Component({
  selector: 'app-competency-list-page',
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
    DomainNamePipe,
    CompetencyNamePipe,
    CompetencyDescriptionPipe,
    PluralPipe,
    PageHeader,
    Skeleton,
    ErrorState,
    StateMessage,
  ],
  template: `
    <div class="page">
      <app-page-header>
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
          <section class="domain" [attr.aria-labelledby]="'domain-' + domain.id">
            <h2 class="domain__title" [id]="'domain-' + domain.id">
              <span class="swatch" [style.background]="domain.color" aria-hidden="true"></span>
              {{ domain | domainName }}
              <span class="domain__count">{{
                'competencies.count' | plural: domain.competencies.length
              }}</span>
            </h2>
            <ul class="grid">
              @for (competency of domain.competencies; track competency.id) {
                <li>
                  <a class="card" [routerLink]="['/competencies', competency.id]">
                    <span class="card__media" [style.background]="domain.tint">
                      @if (competency.thumbnail; as src) {
                        <img [src]="src" width="128" height="128" alt="" loading="lazy" />
                      } @else {
                        <mat-icon svgIcon="domains" aria-hidden="true" />
                      }
                    </span>
                    <span class="card__text">
                      <span class="card__name">{{ competency | competencyName }}</span>
                      <span class="card__description">{{
                        competency | competencyDescription
                      }}</span>
                    </span>
                    <mat-icon class="card__chevron" svgIcon="chevron-right" aria-hidden="true" />
                  </a>
                </li>
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
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      margin-bottom: var(--space-3);
      font-size: var(--text-lg);
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
    }
    .grid {
      display: grid;
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
    .card {
      @include card;

      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 100%;
      min-height: 88px;
      padding: var(--space-3);
      color: inherit;
      text-decoration: none;
      transition:
        border-color 0.15s,
        box-shadow 0.15s,
        transform 0.15s;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-2);
      }

      &:active {
        transform: scale(0.99);
      }
    }
    .card__media {
      display: grid;
      flex: none;
      place-items: center;
      width: 64px;
      height: 64px;
      overflow: hidden;
      border-radius: var(--radius-md);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    .card__text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .card__name {
      color: var(--color-text-strong);
      font-weight: 700;
      line-height: 1.3;
    }
    .card__description {
      @include line-clamp(2);

      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .card__chevron {
      flex: none;
      color: var(--color-text-muted);
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
        competencies: domain.competencies
          .map((competency) => ({ ...competency, thumbnail: competencyThumbnail(competency.slug) }))
          .filter(
            (competency) =>
              !needle ||
              competency.name.toLocaleLowerCase().includes(needle) ||
              this.text.competencyName(competency).toLocaleLowerCase().includes(needle),
          ),
      }))
      .filter((domain) => domain.competencies.length > 0);
  });
}
