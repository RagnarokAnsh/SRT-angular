import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { competencyThumbnail } from '@core/catalog/media';
import type { Competency } from '@core/models/competency';
import { CompetencyDescriptionPipe, CompetencyNamePipe } from '@shared/pipes/catalog-pipes';

/** A competency as a tappable card: picture on its domain's tint, name and description. */
@Component({
  selector: 'app-competency-card',
  imports: [RouterLink, MatIconModule, CompetencyNamePipe, CompetencyDescriptionPipe],
  template: `
    <a class="card" [routerLink]="['/competencies', competency().id]">
      <span class="card__media" [style.background]="tint()">
        @if (thumbnail(); as src) {
          <img [src]="src" width="128" height="128" alt="" loading="lazy" />
        } @else {
          <mat-icon svgIcon="domains" aria-hidden="true" />
        }
      </span>
      <span class="card__text">
        <span class="card__name">{{ competency() | competencyName }}</span>
        <span class="card__description">{{ competency() | competencyDescription }}</span>
      </span>
      <mat-icon class="card__chevron" svgIcon="chevron-right" aria-hidden="true" />
    </a>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      height: 100%;
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
export class CompetencyCard {
  readonly competency = input.required<Competency>();
  /** The domain's light tint, behind the picture. */
  readonly tint = input.required<string>();

  protected readonly thumbnail = computed(() => competencyThumbnail(this.competency().slug));
}
