import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';

import type { Standing } from '../dashboard-model';
import { STANDING_MARK, STANDING_TINT, standingLabelKey } from './standings';

/** A student's name, colour-coded by level (the level's number and name are there too). */
@Component({
  selector: 'app-name-chip',
  template: `
    <span class="chip" [style.background]="tint()" [attr.title]="levelName()">
      <span class="mark" aria-hidden="true">{{ mark() }}</span>
      <span class="name">{{ name() }}</span>
      <span class="visually-hidden">({{ levelName() }})</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      max-width: 100%;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      min-height: 28px;
      padding: 2px 10px 2px 4px;
      border-radius: var(--radius-pill);
      color: var(--level-text);
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .mark {
      display: grid;
      flex: none;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgb(255 255 255 / 70%);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NameChip {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly name = input.required<string>();
  readonly standing = input.required<Standing>();

  protected readonly tint = computed(() => STANDING_TINT[this.standing()]);
  protected readonly mark = computed(() => STANDING_MARK[this.standing()]);
  protected readonly levelName = computed(() => {
    this.language.current();
    return this.transloco.translate(standingLabelKey(this.standing()));
  });
}
