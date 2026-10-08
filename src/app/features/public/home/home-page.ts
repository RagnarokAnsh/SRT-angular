import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ROUTE_ROLES } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session';

import { ReadinessWheel } from './readiness-wheel';

/**
 * The School Readiness home page: the client-approved text (word for word) and the readiness
 * wheel, whose competencies lead into "School Readiness – Domains". Anganwadi workers land
 * here after logging in.
 */
@Component({
  selector: 'app-home-page',
  imports: [TranslocoPipe, ReadinessWheel],
  template: `
    <div class="page home">
      <section class="home__intro">
        <h1 class="home__title">
          {{ 'home.titleBefore' | transloco }}
          <span class="title-highlight">{{ 'home.titleHighlight' | transloco }}</span>
          {{ 'home.titleAfter' | transloco }}
        </h1>
        <p class="home__lead">{{ 'home.intro' | transloco }}</p>
      </section>

      <section class="home__visual">
        <app-readiness-wheel [linked]="linked()" />
      </section>

      <section class="home__closing">
        <p>{{ 'home.closing' | transloco }}</p>
      </section>
    </div>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
      background:
        radial-gradient(90% 60% at 100% 0%, var(--color-primary-softer) 0%, transparent 60%),
        radial-gradient(70% 50% at 0% 40%, var(--color-secondary-soft) 0%, transparent 55%);
    }

    // Phones: overview, wheel, closing words. Wider screens: the overview beside the wheel,
    // and the closing words across the page below them, so no column runs on alone.
    .home {
      display: grid;
      grid-template-areas:
        'intro'
        'visual'
        'closing';
      gap: var(--space-6);
      padding-block: var(--space-6) var(--space-8);

      @include up(md) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
        grid-template-areas:
          'intro visual'
          'closing closing';
        align-items: center;
        column-gap: var(--space-8);
        padding-block: var(--space-8);
      }

      @include up(lg) {
        column-gap: var(--space-12);
      }
    }

    .home__intro {
      grid-area: intro;
    }

    .home__visual {
      grid-area: visual;
    }

    .home__closing {
      grid-area: closing;
    }

    .home__title {
      margin-bottom: var(--space-4);
      font-size: clamp(2rem, 1.4rem + 3vw, 3.25rem);
      line-height: 1.15;
    }

    .home__lead,
    .home__closing p {
      color: var(--color-text);
      line-height: 1.7;
    }

    .home__lead {
      max-width: 65ch;
      margin: 0;
      font-size: var(--text-base);
    }

    .home__closing p {
      margin: 0;
      padding: var(--space-5);
      border-radius: var(--radius-xl);
      background: var(--color-secondary-soft);
      color: #1e1b4b;

      @include up(sm) {
        padding: var(--space-6);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly session = inject(SessionStore);

  /**
   * The wheel opens domain and competency pages for workers and admins, and for visitors (who
   * sign in first). Other roles can't open those pages, so for them it only explains.
   */
  protected readonly linked = computed(
    () => !this.session.isAuthenticated() || this.session.hasAnyRole(...ROUTE_ROLES.competencies),
  );
}
