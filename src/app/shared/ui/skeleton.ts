import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Shimmering placeholders shown while content loads (announced once to screen readers). */
@Component({
  selector: 'app-skeleton',
  imports: [TranslocoPipe],
  template: `
    <span class="visually-hidden" role="status">{{ 'common.loading' | transloco }}</span>
    <div class="items" [class]="'items--' + variant()" aria-hidden="true">
      @for (i of items(); track i) {
        <div class="block"></div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .items {
      display: grid;
      gap: var(--space-3);
    }
    .items--cards {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    .block {
      border-radius: var(--radius-md);
      background: linear-gradient(
        90deg,
        var(--color-surface-sunken) 25%,
        #f8f3f1 37%,
        var(--color-surface-sunken) 63%
      );
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    .items--lines .block {
      height: 1rem;
    }
    .items--lines .block:last-child {
      width: 60%;
    }
    .items--rows .block {
      height: 64px;
    }
    .items--cards .block {
      height: 150px;
    }
    .items--block .block {
      height: 220px;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 50%;
      }
      to {
        background-position: 0 50%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly variant = input<'lines' | 'rows' | 'cards' | 'block'>('rows');
  readonly count = input(3);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
