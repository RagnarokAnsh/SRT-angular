import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { isKnownCompetency } from '@core/catalog/media';
import { LEVELS } from '@core/models/level';

/**
 * The four levels of a competency and what each looks like, as a rising staircase on wide
 * screens and a vertical list on phones (replaces the old English-only rubric images).
 */
@Component({
  selector: 'app-learning-process',
  imports: [TranslocoPipe],
  template: `
    <ol class="steps">
      @for (step of steps(); track step.level; let i = $index) {
        <li
          class="step"
          [style.--step-color]="'var(--level-' + step.level + ')'"
          [style.--step]="i"
        >
          <span class="step__marker" aria-hidden="true">{{ i + 1 }}</span>
          <div class="step__body">
            <h3 class="step__title">{{ 'levels.' + step.level + '.label' | transloco }}</h3>
            <p class="step__text">{{ step.key | transloco }}</p>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }
    .steps {
      position: relative;
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;

      @include up(md) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        align-items: end;
        gap: var(--space-4);
      }
    }
    .step {
      position: relative;
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-inline-start: 6px solid var(--step-color);
      border-radius: var(--radius-md);
      background: var(--color-surface);

      @include up(md) {
        flex-direction: column;
        // Each level sits a step higher than the one before, like the original poster.
        margin-bottom: calc(var(--step) * var(--space-6));
        border-inline-start-width: 1px;
        border-top: 6px solid var(--step-color);
      }
    }
    .step__marker {
      display: grid;
      flex: none;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--step-color);
      color: var(--level-text);
      font-weight: 700;
    }
    .step__title {
      margin: 0 0 var(--space-1);
      font-size: var(--text-base);
    }
    .step__text {
      margin: 0;
      color: var(--color-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningProcess {
  readonly slug = input.required<string>();

  protected readonly steps = computed(() => {
    const known = isKnownCompetency(this.slug());
    return LEVELS.map((level) => ({
      level,
      key: known
        ? `catalog.competencies.${this.slug()}.levels.${level}`
        : `levels.${level}.generic`,
    }));
  });
}
